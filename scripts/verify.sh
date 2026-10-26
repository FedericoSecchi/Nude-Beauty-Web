#!/usr/bin/env bash
# verify.sh — gate obligatorio antes de pushear.
# Cubre PLAN §9: build, typecheck, unit, chequeos sobre out/ (URLs, H1, build-id, no tuteo, no "€"),
# cobertura de keywords y copy-lint por página.
# Checks que dependen de env vars no configuradas quedan SKIP (no se simula un PASS).
set -euo pipefail

cd "$(dirname "$0")/.."

RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[0;33m'; NC='\033[0m'
PASS=0; FAIL=0; SKIP=0
RESULTS_FILE="verify-results.txt"
: > "$RESULTS_FILE"

step() {
  local name="$1"; shift
  printf '%s\n' "---- $name ----"
  if "$@"; then
    printf "${GRN}PASS${NC} %s\n" "$name"
    echo "PASS · $name" >> "$RESULTS_FILE"
    PASS=$((PASS+1))
  else
    local rc=$?
    printf "${RED}FAIL${NC} %s (rc=%s)\n" "$name" "$rc"
    echo "FAIL · $name (rc=$rc)" >> "$RESULTS_FILE"
    FAIL=$((FAIL+1))
  fi
}

skip() {
  local name="$1" reason="$2"
  printf "${YLW}SKIP${NC} %s · %s\n" "$name" "$reason"
  echo "SKIP · $name · $reason" >> "$RESULTS_FILE"
  SKIP=$((SKIP+1))
}

if [ ! -d node_modules ]; then
  step "npm ci" npm ci
fi

# --- Build + typecheck ---
step "typecheck (tsc --noEmit)" npx tsc --noEmit
# Build de prueba "sin stock" (todos los productos en disponible:false) para el e2e de la ficha mobile.
# Va antes del build real: out/ y el snapshot de las functions quedan siempre del contenido real.
build_sinstock() {
  local dir
  dir="$(mktemp -d)/content"
  node scripts/fixture-sin-stock.mjs "$dir" &&
    NUDE_CONTENT_DIR="$dir" npm run build >/tmp/nude-build-sinstock.log 2>&1 &&
    rm -rf out-sinstock && mv out out-sinstock
}
step "build fixture sin stock (out-sinstock/)" build_sinstock
# Variante con Mercado Pago encendido (token de mentira: solo prende el flag del build, no se llama
# a MP). El build real de abajo va con MP apagado, como está hoy producción.
build_con_mp() {
  MP_ACCESS_TOKEN=verify-flag-mp npm run build >/tmp/nude-build-mp.log 2>&1 &&
    rm -rf out-mp && mv out out-mp
}
step "build con Mercado Pago encendido (out-mp/)" build_con_mp
step "build (next build + export, Mercado Pago apagado)" env -u MP_ACCESS_TOKEN npm run build

# --- Unit tests (si existe el dir y tiene archivos) ---
if [ -d tests/unit ] && [ -n "$(find tests/unit -maxdepth 1 -name '*.test.mjs' -print -quit)" ]; then
  step "unit tests (node --test)" npm test --silent
else
  skip "unit tests" "sin tests aún"
fi

# --- Chequeos sobre out/ ---
check_out_exists() {
  [ -d out ] && [ -f out/index.html ]
}
step "out/ existe con index.html" check_out_exists

if [ -d out ]; then
  check_no_euro() {
    ! grep -r --include='*.html' --include='*.json' -F -l '€' out >/dev/null
  }
  step "no hay símbolo € en out/" check_no_euro

  # Antes usaba `\|` dentro de grep -E (ahí es un "|" literal) y no detectaba nada.
  # "Hola" salió de la lista: es el saludo del mensaje de WhatsApp; los productos de prueba viejos
  # se detectan por hola.json / hey.json / test1.
  sin_sucios() {  # sin_sucios <dir> → falla y lista archivo:línea si encuentra algo
    # Texto de relleno y productos viejos: en el contenido (HTML, JSON, payload RSC). En el JS no,
    # porque Next trae la palabra "placeholder" (prop de next/image).
    local bad='Lorem|lorem|test1|barco|placeholder|hola\.json|hey\.json|Sérum Facial Renovador'
    # Marcas de dato pendiente: en todo lo que se publica, JS incluido (ahí estaban las de /pedido/).
    local marcas='\[CONFIRMAR|\[REVISAR'
    local hits
    hits=$( {
      grep -r --include='*.html' --include='*.json' --include='*.txt' --include='*.xml' -E -o -n "$bad" "$1" 2>/dev/null
      grep -r --include='*.html' --include='*.json' --include='*.txt' --include='*.js' --include='*.xml' \
        -E -o -n "$marcas" "$1" 2>/dev/null
    } || true)
    if [ -n "$hits" ]; then echo "sucios en $1:"; echo "$hits" | head -20; return 1; fi
    return 0
  }
  check_sucios_detecta() {
    local tmp; tmp="$(mktemp -d)"
    printf '<p>Tamaño: [CONFIRMAR: x]</p>\n' > "$tmp/a.html"
    printf '{"nota":"[REVISAR LEGAL]"}' > "$tmp/b.json"
    if sin_sucios "$tmp" >/dev/null; then echo "no detectó [CONFIRMAR: x] / [REVISAR LEGAL]"; rm -rf "$tmp"; return 1; fi
    rm "$tmp/a.html"
    if sin_sucios "$tmp" >/dev/null; then echo "no detectó [REVISAR LEGAL] solo"; rm -rf "$tmp"; return 1; fi
    rm "$tmp/b.json"; printf 'x="[CONFIRMAR con Soledad]"' > "$tmp/c.js"
    if sin_sucios "$tmp" >/dev/null; then echo "no detectó [CONFIRMAR en un .js"; rm -rf "$tmp"; return 1; fi
    rm "$tmp/c.js"; printf '<p>ok</p>' > "$tmp/d.html"
    sin_sucios "$tmp" >/dev/null || { echo "falso positivo con un archivo limpio"; rm -rf "$tmp"; return 1; }
    rm -rf "$tmp"
  }
  step "check de placeholders detecta [CONFIRMAR: x] y [REVISAR LEGAL] (archivo de prueba)" check_sucios_detecta
  step "no hay placeholders, marcas ni productos viejos en out/" sin_sucios out

  # Mercado Pago apagado: ni "cuotas", ni "tarjeta", ni "Mercado Pago" en lo que se publica
  # (out/admin/ queda afuera: es el panel de Soledad, no lo ve quien compra).
  palabras_mp() {
    grep -r --include='*.html' --include='*.txt' --include='*.js' --include='*.json' --include='*.xml' \
      --exclude-dir=admin -i -E -o -n 'cuotas|tarjeta|mercado ?pago' "$1" 2>/dev/null || true
  }
  check_sin_mp() {
    local hits; hits=$(palabras_mp out)
    if [ -n "$hits" ]; then echo "con MP apagado aparecen:"; echo "$hits" | head -20; return 1; fi
  }
  step "MP apagado: sin cuotas/tarjeta/Mercado Pago en out/" check_sin_mp
  check_con_mp() {
    [ -d out-mp ] || return 1
    grep -q -i 'cuotas' out-mp/index.html && grep -q 'Mercado Pago' out-mp/terminos-y-condiciones/index.html
  }
  step "MP encendido: vuelven cuotas y Mercado Pago (out-mp/)" check_con_mp

  check_build_id_meta() {
    grep -q '<meta name="build-id"' out/index.html
  }
  step "build-id visible en out/index.html" check_build_id_meta

  check_no_tuteo() {
    # Lista mínima de PLAN §9. Case-insensitive, palabras completas.
    local pat='\b(descubre|descúbrelo|puedes|tienes|quieres|elige|contáctanos|escríbenos|haz clic|compra ahora|regístrate)\b'
    # "agrega" se usa en voseo también ("agregá al carrito" y "agrega al carrito" no se diferencian como palabra),
    # así que buscamos "Agrega al carrito" literal (botón tuteo) por separado.
    local hits
    hits=$(grep -r --include='*.html' -EiHno "$pat" out 2>/dev/null || true)
    local lit
    lit=$(grep -r --include='*.html' -F -Hno 'Agrega al carrito' out 2>/dev/null || true)
    if [ -n "$hits" ] || [ -n "$lit" ]; then
      echo "tuteo detectado:"
      [ -n "$hits" ] && echo "$hits"
      [ -n "$lit" ] && echo "$lit"
      return 1
    fi
    return 0
  }
  step "sin tuteo en out/ (voseo rioplatense)" check_no_tuteo

  check_sitemap_coherence() {
    [ -f out/sitemap.xml ] || return 0  # en E0 todavía no hay sitemap
    local urls
    urls=$(grep -oE '<loc>[^<]+</loc>' out/sitemap.xml | sed 's/<loc>\|<\/loc>//g' | wc -l | tr -d ' ')
    if [ "$urls" = "0" ]; then
      echo "sitemap vacío"
      return 1
    fi
    return 0
  }
  step "sitemap.xml coherente (si existe)" check_sitemap_coherence

  check_identity_solo_admin() {
    # El widget de Netlify Identity solo en /admin/; las páginas públicas no lo cargan.
    local hits
    hits=$(grep -rl --include='*.html' 'netlify-identity-widget' out | grep -v '^out/admin/' || true)
    if [ -n "$hits" ]; then echo "widget de Identity fuera de /admin/:"; echo "$hits"; return 1; fi
    grep -q 'netlify-identity-widget' out/admin/index.html
  }
  step "widget de Identity solo en /admin/" check_identity_solo_admin

  check_return_fees() {
    # Política: el envío del cambio por decisión propia lo paga quien compra.
    local f=out/productos/serum-multi-active/index.html
    grep -q 'ReturnFeesCustomerResponsibility' "$f" && ! grep -rq --include='*.html' 'schema.org/FreeReturn' out
  }
  step "JSON-LD returnFees = ReturnFeesCustomerResponsibility" check_return_fees
else
  skip "chequeos sobre out/" "out/ no generado"
fi

# --- Puerta de publicación (scripts/puerta-publicacion.mjs, corre al final de `npm run build`) ---
check_puerta_simulada() {
  local tmp sucio limpio out rc
  tmp="$(mktemp -d)"; sucio="$tmp/sucio"; limpio="$tmp/limpio"
  mkdir -p "$sucio/productos/x" "$limpio"
  printf '<html><body>\n<p>Tamaño: [CONFIRMAR: ml]</p>\n</body></html>\n' > "$sucio/productos/x/index.html"
  printf '{"nota":"[REVISAR LEGAL]"}' > "$sucio/data.json"
  printf '<html><body>ok</body></html>' > "$limpio/index.html"
  # Contenido con y sin datos de transferencia (alias inventado, solo para la prueba).
  local con_pago="$tmp/con-pago" sin_pago="$tmp/sin-pago"
  cp -R content "$con_pago"; cp -R content "$sin_pago"
  node -e '
    const fs = require("fs"); const [f, alias] = process.argv.slice(1);
    const t = JSON.parse(fs.readFileSync(f, "utf8")); t.alias = alias || null; t.cbu = null;
    fs.writeFileSync(f, JSON.stringify(t));' "$con_pago/ajustes/tienda.json" "prueba.verify"
  node -e '
    const fs = require("fs"); const f = process.argv[1];
    const t = JSON.parse(fs.readFileSync(f, "utf8")); t.alias = ""; t.cbu = "";
    fs.writeFileSync(f, JSON.stringify(t));' "$sin_pago/ajustes/tienda.json"
  # Producción con pendientes → falla y lista archivo:línea.
  rc=0; out=$(env -u MP_ACCESS_TOKEN CONTEXT=production node scripts/puerta-publicacion.mjs "$sucio" "$con_pago" 2>&1) || rc=$?
  [ "$rc" -ne 0 ] || { echo "producción con [CONFIRMAR] no falló"; return 1; }
  echo "$out" | grep -q 'productos/x/index.html:2' || { echo "no lista archivo:línea"; echo "$out"; return 1; }
  echo "$out" | grep -q 'data.json:1  \[REVISAR LEGAL\]' || { echo "no detecta [REVISAR"; echo "$out"; return 1; }
  # Deploy preview con pendientes → solo avisa.
  CONTEXT=deploy-preview node scripts/puerta-publicacion.mjs "$sucio" "$sin_pago" >/dev/null 2>&1 || { echo "preview no debería fallar"; return 1; }
  # Producción sin pendientes y con alias → pasa.
  env -u MP_ACCESS_TOKEN CONTEXT=production node scripts/puerta-publicacion.mjs "$limpio" "$con_pago" >/dev/null 2>&1 || { echo "producción limpia falló"; return 1; }
  # Producción limpia pero sin alias ni CBU y con MP apagado → falla (no hay medio de pago).
  rc=0; out=$(env -u MP_ACCESS_TOKEN CONTEXT=production node scripts/puerta-publicacion.mjs "$limpio" "$sin_pago" 2>&1) || rc=$?
  [ "$rc" -ne 0 ] || { echo "producción sin medio de pago no falló"; return 1; }
  echo "$out" | grep -q 'sin medio de pago' || { echo "no explica que falta el medio de pago"; echo "$out"; return 1; }
  # Lo mismo con MP encendido → pasa (MP alcanza como medio de pago).
  MP_ACCESS_TOKEN=verify-flag-mp CONTEXT=production node scripts/puerta-publicacion.mjs "$limpio" "$sin_pago" >/dev/null 2>&1 || { echo "con MP encendido no debería exigir alias"; return 1; }
  rm -rf "$tmp"
}
step "puerta de publicación simulada (CONTEXT=production bloquea, preview avisa)" check_puerta_simulada

if [ -d out ]; then
  # Lo que diría la puerta de un build de producción con este contenido (no hace fallar verify:
  # el build de producción real se prueba aparte con CONTEXT=production npm run build).
  PUERTA=$(env -u MP_ACCESS_TOKEN node scripts/puerta-publicacion.mjs out 2>&1 | grep '^  ' || true)
  if [ -n "$PUERTA" ]; then
    echo "INFO · puerta: un build de producción con MP apagado hoy fallaría por:"; echo "$PUERTA"
    echo "INFO · puerta (producción, MP apagado) bloquearía:" >> "$RESULTS_FILE"; echo "$PUERTA" >> "$RESULTS_FILE"
  else
    echo "INFO · puerta: un build de producción pasaría" >> "$RESULTS_FILE"
  fi
fi

# --- Cobertura de keywords y copy-lint por página (kosmos-web) ---
SKILL_DIR="${KOSMOS_WEB_SKILL:-$HOME/.claude/skills/kosmos-web}"
KW_SCRIPT="$SKILL_DIR/scripts/kw_coverage.py"
LINT_SCRIPT="$SKILL_DIR/scripts/copy_lint.py"

# Páginas con contenido.md con cuerpo real (más de 40 palabras de prosa fuera del frontmatter,
# los comentarios HTML y los encabezados vacíos del scaffold).
body_words() {
  awk '
    BEGIN { fm=0; depth=0 }
    /^---$/ { fm = (fm==0 ? 1 : 2); next }
    fm==1 { next }
    /<!--/ { depth++; if (!/-->/) next }
    /-->/ { depth--; next }
    depth>0 { next }
    /^#/ { next }
    { print }
  ' "$1" | wc -w | tr -d " "
}
pages_with_body() {
  local n=0
  for dir in seo/paginas/*/; do
    [ -f "$dir/contenido.md" ] || continue
    local w
    w=$(body_words "$dir/contenido.md")
    if [ "$w" -ge 40 ]; then n=$((n+1)); fi
  done
  echo "$n"
}
PAGES_WITH_BODY=$(pages_with_body)

if [ -x "$(command -v python3)" ] && [ -f "$KW_SCRIPT" ] && [ "$PAGES_WITH_BODY" -gt 0 ]; then
  run_kw() {
    local fail=0
    for dir in seo/paginas/*/; do
      [ -f "$dir/keywords.md" ] || continue
      [ -f "$dir/contenido.md" ] || continue
      local w
      w=$(body_words "$dir/contenido.md")
      [ "$w" -ge 40 ] || continue
      # --geo con un token que no aparece en el texto: desactiva la heurística anti-geo-stuffing
      # pensada para keywords tipo "boat tour Hvar". Las nuestras no son geo-based.
      python3 "$KW_SCRIPT" --keywords "$dir/keywords.md" --geo "__no_geo__" "$dir/contenido.md" >/dev/null || fail=1
    done
    return $fail
  }
  step "kw_coverage.py por página" run_kw
else
  skip "kw_coverage.py" "sin contenido real todavía"
fi

if [ -x "$(command -v python3)" ] && [ -f "$LINT_SCRIPT" ] && [ "$PAGES_WITH_BODY" -gt 0 ]; then
  run_lint() {
    local fail=0
    for dir in seo/paginas/*/; do
      [ -f "$dir/contenido.md" ] || continue
      local w
      w=$(body_words "$dir/contenido.md")
      [ "$w" -ge 40 ] || continue
      python3 "$LINT_SCRIPT" --brand "NUDE" --lang es "$dir/contenido.md" >/dev/null || fail=1
    done
    return $fail
  }
  step "copy_lint.py por página" run_lint
else
  skip "copy_lint.py" "sin contenido real todavía"
fi

# --- E2E local (Playwright contra out/ servido estáticamente) ---
if [ -f playwright.config.ts ] || [ -f playwright.config.js ]; then
  if [ -d out ] && [ -d out-sinstock ] && [ -d out-mp ] && command -v npx >/dev/null 2>&1; then
    serve_dir() {  # serve_dir <dir> <port> → deja el pid en SERVE_PID
      pkill -f "serve.*$1.*$2" >/dev/null 2>&1 || true
      # serve fijo en devDependencies: con `npx --yes serve` sin instalar, npx resolvía el paquete
      # contra el registro en cada arranque y a veces no levantaba dentro de la espera de abajo.
      ./node_modules/.bin/serve "$1" -l "$2" >"/tmp/nude-serve-$2.log" 2>&1 &
      SERVE_PID=$!
      local n=0
      while [ $n -lt 30 ]; do
        if /usr/bin/curl -sI "http://127.0.0.1:$2/" >/dev/null 2>&1; then return 0; fi
        sleep 0.3
        n=$((n+1))
      done
      return 1
    }
    run_e2e_local() {
      local rc=0 pid1 pid2 pid3
      serve_dir out 4123 || rc=1; pid1=$SERVE_PID
      serve_dir out-sinstock 4124 || rc=1; pid2=$SERVE_PID
      if [ $rc -eq 0 ]; then
        E2E_BASE_URL="http://127.0.0.1:4123" \
          npx playwright test --grep "home \+ ficha" --project=mobile --project=desktop || rc=$?
        # Carrito con un solo medio de pago (MP apagado) y con dos (out-mp/).
        serve_dir out-mp 4126 || rc=1; pid3=$SERVE_PID
        E2E_BASE_URL="http://127.0.0.1:4123" E2E_MP=0 \
          npx playwright test tests/e2e/medios-pago.spec.ts --project=desktop || rc=$?
        E2E_BASE_URL="http://127.0.0.1:4126" E2E_MP=1 \
          npx playwright test tests/e2e/medios-pago.spec.ts --project=desktop || rc=$?
        kill $pid3 >/dev/null 2>&1 || true
        # Hero de la home visible sin scroll en 390×844 y 1366×850.
        E2E_BASE_URL="http://127.0.0.1:4123" \
          npx playwright test tests/e2e/home-hero.spec.ts --project=desktop || rc=$?
        # CTA mobile en 360×740 (14 fichas con stock + 14 sin stock + barra fija).
        E2E_BASE_URL="http://127.0.0.1:4123" E2E_SINSTOCK_URL="http://127.0.0.1:4124" \
          npx playwright test tests/e2e/ficha-mobile.spec.ts --project=mobile || rc=$?
      fi
      kill $pid1 $pid2 >/dev/null 2>&1 || true
      wait $pid1 $pid2 >/dev/null 2>&1 || true
      return $rc
    }
    # Instala browsers si no están.
    npx playwright install chromium --with-deps >/dev/null 2>&1 || true
    step "e2e local (Playwright sobre out/)" run_e2e_local

    # Botón principal: texto blanco sobre terracota ≥ 4,5:1 (normal y hover), medido en el navegador.
    # Lighthouse mobile de la home: LCP ≤ 2,5 s y CLS ≤ 0,1 (mediana de 3 corridas, `serve` comprime
    # con gzip como hace Netlify con brotli).
    run_diseno() {
      local rc=0 pid
      serve_dir out 4125 || return 1; pid=$SERVE_PID
      node scripts/check-contraste.mjs "http://127.0.0.1:4125" || rc=1
      node scripts/check-lighthouse.mjs "http://127.0.0.1:4125/" lighthouse-home.json || rc=1
      kill $pid >/dev/null 2>&1 || true
      wait $pid >/dev/null 2>&1 || true
      return $rc
    }
    step "contraste AA del botón principal + Lighthouse mobile home (LCP ≤ 2,5 s, CLS ≤ 0,1)" run_diseno
  else
    skip "e2e local" "falta out/ o npx"
  fi
else
  skip "e2e local" "sin playwright config aún"
fi

# --- E2E remoto contra el deploy preview (requiere E2E_TOKEN y que el preview sirva este commit) ---
# El token va solo en el header x-e2e-token de los pedidos de prueba; nunca se imprime.
REMOTE_URL="${E2E_REMOTE_URL:-https://deploy-preview-2--nude-beauty-web.netlify.app}"
if [ -z "${E2E_TOKEN:-}" ]; then
  skip "e2e remoto" "E2E_TOKEN no configurado"
else
  SERVIDO=$(/usr/bin/curl -sL --max-time 20 "$REMOTE_URL/" | grep -oE 'build-id" content="[^"]+"' | head -1 | sed 's/build-id" content="//;s/"$//' || true)
  HEAD_SHA=$(git rev-parse HEAD)
  if [ -z "$SERVIDO" ] || [ "${HEAD_SHA#"$SERVIDO"}" = "$HEAD_SHA" ]; then
    skip "e2e remoto" "el preview sirve ${SERVIDO:-?} y HEAD es ${HEAD_SHA:0:12}: correr verify.sh de nuevo cuando termine el deploy"
  else
    run_e2e_remoto() {
      local rc=0
      bash scripts/preview-check.sh "$REMOTE_URL" "$HEAD_SHA" || rc=1
      # Sin reintentos (playwright.config.ts: retries 0). E2E_MP: lo que el preview tiene que ofrecer.
      E2E_BASE_URL="$REMOTE_URL" E2E_MP="${E2E_MP_REMOTO:-0}" \
        npx playwright test tests/e2e/compra.spec.ts tests/e2e/medios-pago.spec.ts --project=desktop --retries=0 || rc=$?
      E2E_BASE_URL="$REMOTE_URL" \
        npx playwright test tests/e2e/ficha-mobile.spec.ts --project=mobile --grep-invert "sin stock" --retries=0 || rc=$?
      E2E_BASE_URL="$REMOTE_URL" \
        npx playwright test tests/e2e/home-hero.spec.ts --project=desktop --retries=0 || rc=$?
      return $rc
    }
    step "e2e remoto contra $REMOTE_URL (build-id ${SERVIDO})" run_e2e_remoto
  fi
fi

printf "\n==== Resumen ====\n"
printf "PASS=%d FAIL=%d SKIP=%d\n" "$PASS" "$FAIL" "$SKIP"
cat "$RESULTS_FILE"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
