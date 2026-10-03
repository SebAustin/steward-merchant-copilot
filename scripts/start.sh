#!/usr/bin/env bash
# Render start command: apply pending migrations, then serve the production build.
set -euo pipefail

node scripts/migrate.ts
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
