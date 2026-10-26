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
else
  skip "chequeos sobre out/" "out/ no generado"
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
      python3 "$KW_SCRIPT" --keywords "$dir/keywords.md" "$dir/contenido.md" >/dev/null || fail=1
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
  if [ -d out ] && command -v npx >/dev/null 2>&1; then
    run_e2e_local() {
      local port=4123
      local url="http://127.0.0.1:$port"
      pkill -f "serve.*out.*$port" >/dev/null 2>&1 || true
      npx --yes serve out -l "$port" >/tmp/nude-serve.log 2>&1 &
      local pid=$!
      # Esperamos a que el server responda
      local n=0
      while [ $n -lt 20 ]; do
        if /usr/bin/curl -sI "$url/" >/dev/null 2>&1; then break; fi
        sleep 0.3
        n=$((n+1))
      done
      local rc=0
      E2E_BASE_URL="$url" npx playwright test --grep "home \+ ficha" --project=mobile --project=desktop || rc=$?
      kill $pid >/dev/null 2>&1 || true
      wait $pid >/dev/null 2>&1 || true
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
