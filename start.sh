#!/usr/bin/env bash
# One-command launcher: checks Node, installs deps if needed, starts the dev
# server. See README.md "Running it locally" for what this automates and the
# manual step-by-step if you'd rather do it yourself.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/web"

REQUIRED_MAJOR=18
REQUIRED_MINOR=18

node_version_ok() {
  command -v node >/dev/null 2>&1 || return 1
  local v major minor
  v="$(node -v)"
  v="${v#v}"
  major="${v%%.*}"
  minor="${v#*.}"; minor="${minor%%.*}"
  [ "$major" -gt "$REQUIRED_MAJOR" ] && return 0
  [ "$major" -eq "$REQUIRED_MAJOR" ] && [ "$minor" -ge "$REQUIRED_MINOR" ] && return 0
  return 1
}

if ! node_version_ok; then
  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo "Node missing or older than ${REQUIRED_MAJOR}.${REQUIRED_MINOR} -- switching via nvm (reads web/.nvmrc)..."
    # shellcheck disable=SC1090
    source "$HOME/.nvm/nvm.sh"
    nvm install >/dev/null
    nvm use >/dev/null
  else
    echo "Node.js ${REQUIRED_MAJOR}.${REQUIRED_MINOR}+ is required (found: $(node -v 2>/dev/null || echo 'none'), no nvm found either)."
    echo "See README.md 'Running it locally' for install instructions."
    exit 1
  fi
fi

if ! node_version_ok; then
  echo "Still on an unsupported Node version ($(node -v)) after trying nvm -- check web/.nvmrc and your nvm install."
  exit 1
fi

echo "Using Node $(node -v)"

PORT="${PORT:-3000}"
if command -v lsof >/dev/null 2>&1 && lsof -i "tcp:${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${PORT} is already in use:"
  lsof -i "tcp:${PORT}" -sTCP:LISTEN
  echo "Stop that process, or run: PORT=<other-port> ./start.sh"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run)..."
  npm install
fi

echo "Starting AlgoBench at http://localhost:${PORT}"
exec npm run dev -- -p "$PORT"
