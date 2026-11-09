#!/usr/bin/env bash
set -euo pipefail

# Verifies the isolation guarantees of the running NexPhone runtime container.
name="${1:-nexphone-runtime}"
failures=0

if ! docker inspect "$name" >/dev/null 2>&1; then
  echo "Container $name does not exist. Start the runtime first." >&2
  exit 1
fi

privileged=$(docker inspect "$name" --format '{{.HostConfig.Privileged}}')
if [[ "$privileged" == "false" ]]; then
  echo "  [ ok ] container is not privileged"
else
  echo "  [fail] container is privileged" >&2
  failures=$((failures + 1))
fi

if docker inspect "$name" --format '{{json .Mounts}}' | grep -q 'docker.sock'; then
  echo "  [fail] container mounts the host Docker socket" >&2
  failures=$((failures + 1))
else
  echo "  [ ok ] container has no host Docker socket"
fi

network=$(docker inspect "$name" --format '{{.HostConfig.NetworkMode}}')
if [[ "$network" == "host" ]]; then
  echo "  [fail] container shares the host network namespace" >&2
  failures=$((failures + 1))
else
  echo "  [ ok ] container uses its own network namespace ($network)"
fi

pidmode=$(docker inspect "$name" --format '{{.HostConfig.PidMode}}')
if [[ -n "$pidmode" && "$pidmode" != "host" ]]; then
  echo "  [ ok ] container uses a private PID namespace"
elif [[ "$pidmode" == "host" ]]; then
  echo "  [fail] container shares the host PID namespace" >&2
  failures=$((failures + 1))
else
  echo "  [ ok ] container uses the default PID namespace"
fi

mounts=$(docker inspect "$name" --format '{{json .Mounts}}')
if echo "$mounts" | grep -q '/home\|/root\|"Source":"/"'; then
  echo "  [warn] review the mount list for host directories"
  echo "$mounts"
else
  echo "  [ ok ] no obvious host home or root mounts"
fi

if [[ "$failures" -gt 0 ]]; then
  exit 1
fi
