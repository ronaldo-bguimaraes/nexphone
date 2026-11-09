#!/usr/bin/env bash
set -uo pipefail

# NexPhone host preflight. Read-only: it never starts the runtime.
failures=0

pass() { printf '  [ ok ] %s\n' "$1"; }
fail() { printf '  [fail] %s\n         %s\n' "$1" "$2"; failures=$((failures + 1)); }

printf 'NexPhone preflight\n\n'

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    pass "Docker Engine reachable"
  else
    fail "Docker Engine not reachable" "Start Docker and add the user to the docker group."
  fi
else
  fail "Docker not installed" "Install Docker Engine 27+ and Docker Compose v2."
fi

if [[ -c /dev/kvm ]]; then
  if [[ -r /dev/kvm && -w /dev/kvm ]]; then
    pass "/dev/kvm is accessible"
  else
    fail "/dev/kvm is not accessible" "Enable virtualization and add the user to the kvm group."
  fi
else
  fail "/dev/kvm is missing" "Enable hardware virtualization in firmware; nested virtualization may be required in a VM."
fi

if [[ -d /dev/binderfs ]] || [[ -c /dev/binder ]]; then
  pass "Android binder is available"
else
  fail "Android binder is unavailable" "Run: sudo modprobe binder_linux devices=binder,hwbinder,vndbinder && sudo mkdir -p /dev/binderfs && sudo mount -t binder binder /dev/binderfs"
fi

for port in 8443 8080; do
  if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}$"; then
    fail "Port ${port} is already in use" "Stop the conflicting service or change the port in deploy/.env."
  else
    pass "Port ${port} is free"
  fi
done

if [[ -f deploy/.env ]]; then
  image=$(grep -E '^NEXPHONE_RUNTIME_IMAGE=' deploy/.env | cut -d= -f2- || true)
  if [[ "$image" =~ @sha256:[a-f0-9]{64}$ ]]; then
    pass "Runtime image is pinned to a digest"
  else
    fail "Runtime image is not pinned" "Run ./deploy/scripts/pin-image.sh <tag> and update deploy/.env."
  fi
else
  fail "deploy/.env is missing" "Copy deploy/.env.example to deploy/.env and set the pinned image."
fi

available_kb=$(df -Pk . | awk 'NR==2 {print $4}')
if [[ -n "$available_kb" && "$available_kb" -gt 10485760 ]]; then
  pass "At least 10 GiB of free disk"
else
  fail "Less than 10 GiB of free disk" "Free disk space before pulling the runtime image."
fi

if command -v adb >/dev/null 2>&1; then
  pass "adb is installed"
else
  fail "adb is missing" "Install Android platform-tools (the gateway image already includes adb)."
fi

printf '\n'
if [[ "$failures" -gt 0 ]]; then
  printf '%d prerequisite(s) failed. Fix them before deploying.\n' "$failures"
  exit 1
fi

printf 'All prerequisites passed.\n'
