#!/usr/bin/env bash
# Render start command: validate the environment, apply pending migrations, serve the build.
set -euo pipefail

node scripts/check-env.ts
node scripts/migrate.ts
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
