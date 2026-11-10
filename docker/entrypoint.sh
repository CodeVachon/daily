#!/bin/sh
# One image, several roles. Every setting comes from the environment (the
# droplet's env file); varlock validates it against .env.schema at boot.
#
#   web      the Next.js server (default)
#   migrate  apply database migrations, then exit
#   worker   background sync of linked GitHub/Jira items (one instance)
set -eu
cd /app

role="${1:-web}"
case "$role" in
  web) exec varlock run -- node apps/web/server.js ;;
  migrate) exec varlock run -- node migrate.mjs /app/migrations ;;
  worker) exec varlock run -- node worker.mjs ;;
  *)
    echo "unknown role: $role (expected web, migrate or worker)" >&2
    exit 64
    ;;
esac
