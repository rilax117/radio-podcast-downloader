#!/usr/bin/env bash
# Build extension artifacts into ./dist/
#   - extension-webstore.zip : clean zip of chrome-extension/ for Chrome Web Store upload
#   - extension.crx          : signed .crx for private distribution (if .pem is present)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$ROOT/chrome-extension"
DIST_DIR="$ROOT/dist"
PEM="$ROOT/chrome-extension.pem"

if [[ ! -d "$EXT_DIR" ]]; then
  echo "error: $EXT_DIR not found" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
rm -f "$DIST_DIR/extension-webstore.zip" "$DIST_DIR/extension.crx"

# 1. Web Store zip — clean (no dotfiles, no .DS_Store, no .pem)
echo "==> Building dist/extension-webstore.zip"
(
  cd "$EXT_DIR"
  zip -r "$DIST_DIR/extension-webstore.zip" . \
    -x "*.DS_Store" -x ".*" -x "*/.*" -x "*.pem" -x "*.crx" \
    > /dev/null
)
echo "    $(du -h "$DIST_DIR/extension-webstore.zip" | cut -f1)"

# Safety check: refuse to continue if the zip somehow contains a .pem
if unzip -l "$DIST_DIR/extension-webstore.zip" | grep -qE '\.pem$'; then
  echo "FATAL: extension-webstore.zip contains a .pem file. Aborting." >&2
  rm -f "$DIST_DIR/extension-webstore.zip"
  exit 2
fi

# 2. Signed .crx for private distribution (optional)
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ -f "$PEM" && -x "$CHROME" ]]; then
  echo "==> Building dist/extension.crx (signed with $(basename "$PEM"))"
  # Chrome writes <ext_dir>.crx next to the source dir; force a clean run.
  rm -f "$EXT_DIR.crx"
  "$CHROME" --pack-extension="$EXT_DIR" \
            --pack-extension-key="$PEM" \
            --no-message-box >/dev/null 2>&1 || true
  if [[ -f "$EXT_DIR.crx" ]]; then
    mv "$EXT_DIR.crx" "$DIST_DIR/extension.crx"
    echo "    $(du -h "$DIST_DIR/extension.crx" | cut -f1)"
  else
    echo "    warning: Chrome did not produce a .crx (check the .pem)"
  fi
else
  echo "==> Skipping .crx (no .pem or Chrome.app not found)"
fi

echo
echo "Done. Artifacts in $DIST_DIR:"
ls -la "$DIST_DIR"
