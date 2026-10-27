#!/usr/bin/env bash
# preview-check.sh — Verifica que el deploy preview sirva el commit correcto y todas las URLs del
# sitemap devuelvan 200. Uso: scripts/preview-check.sh <preview-url> [commit-sha]
set -euo pipefail

PREVIEW_URL=${1:-}
EXPECTED_SHA=${2:-}

if [ -z "$PREVIEW_URL" ]; then
  echo "uso: $0 <preview-url> [commit-sha]" >&2
  exit 2
fi

CURL=${CURL:-/usr/bin/curl}

echo "--- build-id en $PREVIEW_URL/ ---"
HOME_HTML=$("$CURL" -sL --max-time 20 "$PREVIEW_URL/")
BUILD_ID=$(echo "$HOME_HTML" | grep -oE 'build-id" content="[^"]+"' | head -1 | sed 's/build-id" content="//;s/"$//')
echo "build-id: $BUILD_ID"
if [ -n "$EXPECTED_SHA" ]; then
  short=${EXPECTED_SHA:0:12}
  if [ "$BUILD_ID" != "$short" ]; then
    echo "FAIL · build-id esperado=$short servido=$BUILD_ID" >&2
    exit 1
  fi
fi

echo ""
echo "--- URLs del sitemap ---"
"$CURL" -sL --max-time 20 "$PREVIEW_URL/sitemap.xml" \
  | grep -oE '<loc>[^<]+</loc>' | sed 's|<loc>||;s|</loc>||' > /tmp/preview-urls.list
total=0; ok=0; fail=0
while IFS= read -r u; do
  [ -z "$u" ] && continue
  path=${u#https://nudecosmetica.com}
  code=$("$CURL" -sIL --max-time 15 "$PREVIEW_URL$path" -o /dev/null -w "%{http_code}")
  total=$((total+1))
  if [ "$code" = "200" ]; then
    ok=$((ok+1))
  else
    fail=$((fail+1))
    echo "  FAIL $code $path"
  fi
done < /tmp/preview-urls.list
rm -f /tmp/preview-urls.list
echo "sitemap: $ok / $total"

echo ""
echo "--- 404 real ---"
code404=$("$CURL" -sIL --max-time 15 "$PREVIEW_URL/nope-9999/" -o /dev/null -w "%{http_code}")
echo "status: $code404"
if [ "$code404" != "404" ]; then
  echo "FAIL · URL inexistente no devuelve 404" >&2
  exit 1
fi

if [ "$fail" -gt 0 ]; then
  echo "FAIL · $fail URLs del sitemap no devolvieron 200" >&2
  exit 1
fi

echo ""
echo "OK · $ok URLs en 200 · 404 real · build-id $BUILD_ID"
