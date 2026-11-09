# M0 validation results

**Date**: 2026-11-09
**Environment**: development workstation, Ubuntu-family Linux, Node.js 26.13.0, Docker 29.9.3,
Compose v5.7.0, `/dev/kvm` present. Android binder module was **not** loaded (host `sudo` requires
an interactive password), so real-runtime checks could not run in this session.

## Completed in this environment

| Check | Result | Evidence |
| --- | --- | --- |
| Backend typecheck | PASS | `npm run typecheck -w backend` |
| Client typecheck | PASS | `npm run typecheck -w client` |
| Unit and contract tests | PASS | `npm run test:unit -w backend` (70 tests) |
| Client unit tests | PASS | `npm run test -w client` |
| Adapter contract suite (fake adapter) | PASS | `backend/tests/contract/runtime-adapter.spec.ts` |
| Adapter boundary check | PASS | `backend/tests/unit/boundary.spec.ts` |
| Container isolation specification | PASS | `backend/tests/unit/redroid-container.spec.ts` asserts `Privileged: false` |
| Configuration validation | PASS | `backend/tests/unit/config.spec.ts` |
| Compose syntax | PASS | `docker compose config` (gateway, caddy, optional runtime profile) |
| scrcpy server pinned download | PASS | SHA-256 verified at image build |
| Gateway API flow with fake adapter | PASS | health → start → ready status → pair code → pair → apps → second pair 409 → revoke 204 → status 401 |
| WebSocket session handshake | PASS | `auth_ok` → `video_config` → input accepted → `pong` → clean close |
| Operator token permissions | PASS | `data/state/operator-token` created with mode 0600 |
| Gateway container image | PASS | `docker build -f backend/Dockerfile .` (Node 24, adb, pinned scrcpy server checksum) |
| Gateway container run | PASS | health and status served from the built image as the non-root `node` user |

## Pending on a KVM + binder host

These are the Phase 0 hard gates and the acceptance criteria that require a real runtime:

| Task | Check | Status |
| --- | --- | --- |
| T031 | Runtime boots and reports ready | Pending |
| T045 | Idempotent deployment | Pending |
| T048 | Install, launch, stop a real APK | Pending |
| T055 | Launch without a launcher | Pending |
| T060 | Streaming and latency measurement | Pending |
| T075 | Persistence across host reboot | Pending |
| T078 | Persistence across runtime restart | Pending |
| T079 | Host reboot script | Pending |
| T085 | Failure injection against real runtime | Pending |
| T096 | Real isolation inspection | Pending |
| T108 | Full quickstart run | Pending |
| T111 | Full integration suite | Pending |

## Blockers

1. **Binder not loaded**: `modprobe binder_linux` requires `sudo` with an interactive password. The
   module exists at `/lib/modules/$(uname -r)/kernel/drivers/android/binder_linux.ko.zst`.
2. **Runtime image not pinned**: `deploy/.env` and `config/nexphone.yaml` still contain the
   all-zero digest placeholder. Run `deploy/scripts/pin-image.sh` on the host.
3. **Sample APK not selected**: the integration fixture is intentionally operator-supplied with a
   checksum.

## Isolation gate outcome

**Not yet decided.** The code refuses to use `--privileged`, but whether Redroid boots with the
documented capability set (`SYS_ADMIN`, `NET_ADMIN`, bridge network, data-only mount) is unverified.
If it does not, the runtime must be replaced by a VM-isolated implementation before US1 is accepted.

## Recommendation

Run `deploy/scripts/preflight.sh`, pin the runtime image, add a sample APK and execute
`NEXPHONE_INTEGRATION=1 npm run test:integration -w backend` on the target host. Update this file
with the measured latency, frame rate and resource baseline.
