#!/usr/bin/env bash
set -euo pipefail

version="3.3.3"
checksum="7e70323ba7f259649dd4acce97ac4fefbae8102b2c6d91e2e7be613fd5354be0"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
destination="$root/deploy/vendor/scrcpy-server.jar"

mkdir -p "$(dirname "$destination")"
curl -fsSL -o "$destination" \
  "https://github.com/Genymobile/scrcpy/releases/download/v${version}/scrcpy-server-v${version}"
echo "${checksum}  ${destination}" | sha256sum -c -
echo "Fetched scrcpy-server v${version} to ${destination}"
