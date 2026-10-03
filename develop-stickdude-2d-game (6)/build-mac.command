#!/bin/bash
set -e
cd "$(dirname "$0")"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This makes a Mac DMG. Run it on a Mac, not on Windows."
  exit 1
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Install Node.js 22.12 or newer on this Mac, then reopen Terminal."
  exit 1
fi
if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)'; then
  echo "Your Node.js is too old. Install version 22.12 or newer, then reopen Terminal."
  exit 1
fi
if [[ ! -f package.json || ! -f scripts/build-mac.mjs || ! -f desktop/main.cjs ]]; then
  echo "The full StickDude project is required, not just its game preview."
  exit 1
fi

echo "Installing build tools (this may take several minutes)..."
npm install --no-audit --no-fund
echo "Building StickDude.dmg..."
node scripts/build-mac.mjs "$@"
echo "StickDude.dmg is in this folder."