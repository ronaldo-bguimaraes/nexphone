#!/usr/bin/env bash
set -euo pipefail

# Verifies persistence across a host reboot. Run this on the host after a reboot.
# It expects the runtime and the sample APK used by the integration suite.

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

marker="/sdcard/nexphone-reboot-marker"

if [[ "${1:-}" == "prepare" ]]; then
  adb -s "${NEXPHONE_ADB_SERIAL:?set NEXPHONE_ADB_SERIAL}" shell \
    "mkdir -p /sdcard 2>/dev/null; echo ok > ${marker}"
  echo "Marker written. Reboot the host, start NexPhone, then run this script without 'prepare'."
  exit 0
fi

value=$(adb -s "${NEXPHONE_ADB_SERIAL:?set NEXPHONE_ADB_SERIAL}" shell "cat ${marker}" | tr -d '\r')
if [[ "$value" == "ok" ]]; then
  echo "PASS: application data survived the host reboot"
else
  echo "FAIL: marker missing or unreadable after reboot" >&2
  exit 1
fi
