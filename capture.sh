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

if [[ -z "${CAPTURE_URL:-}" || -z "${CAPTURE_DIR:-}" ]]; then
  echo "Set CAPTURE_URL and CAPTURE_DIR." >&2
  exit 1
fi

RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
export RUNTIME_DIR

time_it "prepare capture directory" mkdir -p "$CAPTURE_DIR"

status=0
if time_it "browser capture" node "$PROJECT_DIR/capture.mjs"; then
  status=0
else
  status=$?
fi

if [[ -f "$CAPTURE_DIR/final-desktop.png" && -f "$CAPTURE_DIR/final-mobile.png" ]]; then
  printf '[capture] final-desktop.png and final-mobile.png are ready in %s\n' "$CAPTURE_DIR" >&2
fi

exit "$status"
