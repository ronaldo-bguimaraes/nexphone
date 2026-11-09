#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

# Stop services but keep the nexphone-data and nexphone-state volumes.
docker compose --env-file deploy/.env -f deploy/compose.yaml down

echo "Stopped. Persistent data remains in the nexphone-data volume."
