#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
export PROJECT_DIR PORT OPENCODE_WEB_DIR

time_it() {
  /usr/bin/time -p "$@"
}

time_it mkdir -p "$OPENCODE_WEB_DIR"
if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    time_it npm ci --no-audit --no-fund --ignore-scripts
  else
    time_it npm install --no-audit --no-fund --ignore-scripts
  fi
fi
time_it node scripts/build.mjs
time_it node -e 'const fs=require("node:fs"),path=require("node:path"); const project=path.resolve(process.env.PROJECT_DIR); const web=process.env.OPENCODE_WEB_DIR; const directory=path.join(project,"dist"); const target=path.join(web,"deployment-output.json"); fs.mkdirSync(web,{recursive:true}); fs.writeFileSync(target,JSON.stringify({project,directory})); console.log(`Deployment output: ${target}`);'
time_it test -f "$PROJECT_DIR/dist/index.html"

exec /usr/bin/time -p node scripts/serve.mjs
