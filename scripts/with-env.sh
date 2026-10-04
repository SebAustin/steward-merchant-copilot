#!/usr/bin/env bash
# Run a command with variables from an env file. Variables already set in the environment win,
# so CI or a developer can override one value (e.g. DATABASE_URL) without editing the file.
# Usage: scripts/with-env.sh .env.ci <command> [args...]
set -euo pipefail

file="$1"
shift

# `|| [[ -n $line ]]` keeps a final line that has no trailing newline.
while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  [[ -z "${line//[[:space:]]/}" || "$line" == \#* ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  if [[ -z "${!key+x}" ]]; then
    export "$key=$value"
  fi
done <"$file"

exec "$@"
