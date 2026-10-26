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
step "build (next build + export)" npm run build

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

  check_no_dirty() {
    local bad="Lorem\|lorem\|test1\|barco\|placeholder\|Hola\|hola.json\|hey.json\|Sérum Facial Renovador"
    if grep -r --include='*.html' --include='*.json' -E -l "$bad" out >/dev/null; then
      echo "sucios en out/:"
      grep -r --include='*.html' --include='*.json' -E -l "$bad" out || true
      return 1
    fi
    return 0
  }
  step "no hay placeholders ni productos viejos" check_no_dirty

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
  # Producción con pendientes → falla y lista archivo:línea.
  rc=0; out=$(CONTEXT=production node scripts/puerta-publicacion.mjs "$sucio" 2>&1) || rc=$?
  [ "$rc" -ne 0 ] || { echo "producción con [CONFIRMAR] no falló"; return 1; }
  echo "$out" | grep -q 'productos/x/index.html:2' || { echo "no lista archivo:línea"; echo "$out"; return 1; }
  echo "$out" | grep -q 'data.json:1  \[REVISAR LEGAL\]' || { echo "no detecta [REVISAR"; echo "$out"; return 1; }
  # Deploy preview con pendientes → solo avisa.
  CONTEXT=deploy-preview node scripts/puerta-publicacion.mjs "$sucio" >/dev/null 2>&1 || { echo "preview no debería fallar"; return 1; }
  # Producción sin pendientes → pasa.
  CONTEXT=production node scripts/puerta-publicacion.mjs "$limpio" >/dev/null 2>&1 || { echo "producción limpia falló"; return 1; }
  rm -rf "$tmp"
}
step "puerta de publicación simulada (CONTEXT=production bloquea, preview avisa)" check_puerta_simulada

if [ -d out ]; then
  PENDIENTES=$(node scripts/puerta-publicacion.mjs out 2>&1 | grep -c '^  out/' || true)
  if [ "$PENDIENTES" -gt 0 ]; then
    echo "INFO · puerta: out/ tiene $PENDIENTES marcas [CONFIRMAR]/[REVISAR] → hoy un build de producción fallaría (esperado hasta que Soledad confirme)"
    echo "INFO · puerta: $PENDIENTES marcas pendientes en out/ (producción bloqueada)" >> "$RESULTS_FILE"
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
  if [ -d out ] && [ -d out-sinstock ] && command -v npx >/dev/null 2>&1; then
    serve_dir() {  # serve_dir <dir> <port> → deja el pid en SERVE_PID
      pkill -f "serve.*$1.*$2" >/dev/null 2>&1 || true
      npx --yes serve "$1" -l "$2" >"/tmp/nude-serve-$2.log" 2>&1 &
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
      local rc=0 pid1 pid2
      serve_dir out 4123 || rc=1; pid1=$SERVE_PID
      serve_dir out-sinstock 4124 || rc=1; pid2=$SERVE_PID
      if [ $rc -eq 0 ]; then
        E2E_BASE_URL="http://127.0.0.1:4123" \
          npx playwright test --grep "home \+ ficha" --project=mobile --project=desktop || rc=$?
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
  else
    skip "e2e local" "falta out/ o npx"
  fi
else
  skip "e2e local" "sin playwright config aún"
fi

# --- Env vars condicionales ---
for v in E2E_TOKEN; do
  if [ -z "${!v:-}" ]; then
    skip "e2e remoto ($v)" "variable no configurada"
    break
  fi
done

printf "\n==== Resumen ====\n"
printf "PASS=%d FAIL=%d SKIP=%d\n" "$PASS" "$FAIL" "$SKIP"
cat "$RESULTS_FILE"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
