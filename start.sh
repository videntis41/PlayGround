#!/usr/bin/env bash
set -euo pipefail

time_it() {
  local label="$1"
  shift
  local started finished status
  started="$(date +%s%3N)"
  if "$@"; then
    status=0
  else
    status=$?
  fi
  finished="$(date +%s%3N)"
  printf '[timing] %s: %d ms\n' "$label" "$((finished - started))" >&2
  return "$status"
}

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

PORT="${PORT:-3000}"
export PORT
BUILD_DIR="$PROJECT_DIR/dist"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"

case "$PORT" in
  ''|*[!0-9]*) echo "PORT must be a positive integer." >&2; exit 1 ;;
esac

time_it "prepare metadata directory" mkdir -p "$WEB_DIR"

if [[ -f "$PROJECT_DIR/package.json" ]]; then
  needs_install="$(node -e 'const p=require("./package.json");const n={...(p.dependencies||{}),...(p.devDependencies||{})};process.stdout.write(Object.keys(n).length?"yes":"no")' 2>/dev/null || printf 'no')"
  if [[ "$needs_install" == "yes" ]]; then
    if [[ -f "$PROJECT_DIR/package-lock.json" ]]; then
      time_it "install dependencies" npm ci --no-audit --no-fund
    else
      time_it "install dependencies" npm install --no-audit --no-fund
    fi
  else
    printf '[timing] install dependencies: skipped (no dependencies)\n' >&2
  fi
else
  printf '[timing] install dependencies: skipped (no package.json)\n' >&2
fi

time_it "build static output" node "$PROJECT_DIR/build.mjs"

if [[ ! -f "$BUILD_DIR/index.html" ]]; then
  echo "Build output is missing index.html at $BUILD_DIR." >&2
  exit 1
fi

time_it "write deployment metadata" node -e '
const fs = require("node:fs");
const path = require("node:path");
const project = process.argv[1];
const directory = path.resolve(process.argv[2]);
const destination = process.argv[3];
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, JSON.stringify({ project, directory }));
' "$PROJECT_DIR" "$BUILD_DIR" "$WEB_DIR/deployment-output.json"

printf '[timing] server launch: starting foreground server on port %s\n' "$PORT" >&2
exec node "$PROJECT_DIR/serve.mjs"
