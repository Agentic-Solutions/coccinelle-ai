#!/bin/bash
# fix-spa-404.sh — Post-build script for Cloudflare Pages SPA routing
#
# Cloudflare Pages serves 404.html for unmatched URLs in a directory.
# Next.js static export with dynamic routes ([id]) only generates a
# placeholder (_/index.html). This script copies that placeholder as
# 404.html in each dynamic route directory so Cloudflare serves the
# app shell (with client-side router) instead of the dead 404 page.
#
# Run AFTER `next build` and BEFORE `wrangler pages deploy`.
# Idempotent: safe to run multiple times.

set -e

OUT_DIR="out"

# Dynamic route directories: source placeholder -> target 404.html
declare -a ROUTES=(
  "dashboard/products/_/index.html:dashboard/products/404.html"
  "dashboard/crm/prospects/_/index.html:dashboard/crm/prospects/404.html"
  "dashboard/customers/_/index.html:dashboard/customers/404.html"
  "dashboard/rdv/_/index.html:dashboard/rdv/404.html"
  "booking/_/index.html:booking/404.html"
)

ERRORS=0

for route in "${ROUTES[@]}"; do
  SRC="${OUT_DIR}/${route%%:*}"
  DEST="${OUT_DIR}/${route##*:}"

  if [ ! -f "$SRC" ]; then
    echo "ERROR: placeholder missing: $SRC"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  cp "$SRC" "$DEST"
  echo "OK: $DEST ($(wc -c < "$DEST" | tr -d ' ') bytes)"
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "FAILED: $ERRORS placeholder(s) missing. Fix generateStaticParams."
  exit 1
fi

echo ""
echo "fix-spa-404: $((${#ROUTES[@]} - ERRORS))/${#ROUTES[@]} dynamic 404.html created."
