#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

if [[ ! -f deploy/.env ]]; then
  echo "deploy/.env is missing. Copy deploy/.env.example and pin the runtime image." >&2
  exit 1
fi

if [[ ! -f config/nexphone.yaml ]]; then
  cp config/nexphone.example.yaml config/nexphone.yaml
  echo "Created config/nexphone.yaml from the example. Review it before continuing." >&2
  exit 1
fi

./deploy/scripts/preflight.sh

docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build

echo
echo "NexPhone is starting."
echo "  Status:  ./deploy/scripts/status.sh"
echo "  Pair:    export NEXPHONE_URL=https://localhost:8443"
echo "           export NEXPHONE_OPERATOR_TOKEN=\$(docker compose --env-file deploy/.env -f deploy/compose.yaml exec -T gateway cat /state/operator-token)"
echo "           npm run cli -w backend -- pair"
