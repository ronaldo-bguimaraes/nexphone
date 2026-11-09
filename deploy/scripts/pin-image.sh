#!/usr/bin/env bash
set -euo pipefail

# Prints the RepoDigest for an image tag. Use the result as
# NEXPHONE_RUNTIME_IMAGE in deploy/.env and as runtime.image in config.
image="${1:?usage: pin-image.sh <image:tag>}"

docker pull "$image" >/dev/null
digest=$(docker inspect --format '{{index .RepoDigests 0}}' "$image")
echo "$digest"
