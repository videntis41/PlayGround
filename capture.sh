#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
cd "$PROJECT_DIR"
export PROJECT_DIR

: "${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL.}"
: "${CAPTURE_DIR:?Set CAPTURE_DIR to an output directory outside the project.}"

time_it() {
  /usr/bin/time -p "$@"
}

resolved_project="$(time_it realpath -m "$PROJECT_DIR")"
resolved_capture="$(time_it realpath -m "$CAPTURE_DIR")"

case "$resolved_capture/" in
  "$resolved_project/"*)
    echo "CAPTURE_DIR must be outside the project source tree." >&2
    exit 1
    ;;
esac

time_it mkdir -p "$CAPTURE_DIR"
time_it node scripts/capture.mjs
