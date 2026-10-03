#!/usr/bin/env bash
# Run a command with variables from an env file. Variables already set in the environment win,
# so CI or a developer can override one value (e.g. DATABASE_URL) without editing the file.
# Usage: scripts/with-env.sh .env.ci <command> [args...]
set -euo pipefail

file="$1"
shift

while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  if [[ -z "${!key+x}" ]]; then
    export "$key=$value"
  fi
done <"$file"

exec "$@"
