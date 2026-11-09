#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

if [[ -z "${NEXPHONE_OPERATOR_TOKEN:-}" ]]; then
  NEXPHONE_OPERATOR_TOKEN=$(
    docker compose --env-file deploy/.env -f deploy/compose.yaml \
      exec -T gateway cat /state/operator-token 2>/dev/null | tr -d '\r\n'
  )
  export NEXPHONE_OPERATOR_TOKEN
fi

if [[ -z "${NEXPHONE_OPERATOR_TOKEN:-}" ]]; then
  echo "Could not read the operator token from the gateway container." >&2
  echo "Start the stack with ./deploy/scripts/up.sh first." >&2
  exit 1
fi

NEXPHONE_URL="${NEXPHONE_URL:-https://localhost:8443}" \
  node backend/dist/cli.js status
