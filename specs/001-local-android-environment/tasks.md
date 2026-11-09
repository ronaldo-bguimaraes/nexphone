---

description: "Task list for NexPhone M0 — Local Virtual Android Environment"
---

# Tasks: NexPhone M0 — Local Virtual Android Environment

**Input**: Design documents from `/specs/001-local-android-environment/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Required by NFR-008 and the Success Criteria. Unit, adapter-contract, protocol and
integration tests are included. Integration tests marked `@integration` require a KVM-capable host
with binder and a real runtime.

**Organization**: Tasks are grouped by user story so each can be implemented, tested and
demonstrated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story label (US1–US6); omitted for setup, foundational and polish phases
- Every task includes an exact file path

## Path Conventions

Repository layout from `plan.md`: `backend/src/`, `backend/tests/`, `client/src/`, `deploy/`,
`docs/`, `data/` (gitignored).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the monorepo and toolchain.

- [ ] T001 Create the repository layout and root npm workspace in `package.json`, add `data/` to `.gitignore`, and scaffold `backend/`, `client/`, `deploy/`, `docs/`, and `backend/tests/fixtures/`
- [ ] T002 Initialize the backend package with TypeScript, Fastify, Zod, Pino, Dockerode, Better-SQLite3, `@yume-chan/adb`, `@yume-chan/scrcpy`, Vitest, ESLint and Prettier in `backend/package.json` and `backend/tsconfig.json`
- [ ] T003 Initialize the client package with React 18, Vite, TypeScript, Vitest and Playwright in `client/package.json`, `client/tsconfig.json` and `client/vite.config.ts`
- [ ] T004 [P] Configure shared linting and formatting in `eslint.config.js`, `.prettierrc` and `.editorconfig`
- [ ] T005 [P] Create `deploy/.env.example` and `config/nexphone.example.yaml` from the configuration contract, including the `runtime.image` pinned-digest requirement
- [ ] T006 [P] Create the backend container image in `backend/Dockerfile` using a multi-stage Node.js 22 build and a non-root runtime user
- [ ] T007 [P] Create the client build image in `client/Dockerfile` or configure static build output for the gateway in `client/vite.config.ts`
- [ ] T008 [P] Add a CI workflow running typecheck, lint and unit/contract tests in `.github/workflows/ci.yml`
- [ ] T009 [P] Document the integration fixture policy (pinned checksums, licenses) in `backend/tests/fixtures/README.md`

**Checkpoint**: Workspace installs, builds, lints and runs an empty test suite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contract, configuration, persistence and authentication. Blocks all stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T010 Implement the strict Zod configuration schema and loader in `backend/src/config/schema.ts` and `backend/src/config/load.ts`, enforcing the documented ranges and rejecting unknown keys
- [ ] T011 [P] Implement the normalized error taxonomy in `backend/src/runtime/errors.ts` with the `AdapterErrorCode` values from `contracts/runtime-adapter.md` and remediation text
- [ ] T012 [P] Implement Pino logging with redaction of tokens, pairing codes and certificate material in `backend/src/observability/logger.ts`
- [ ] T013 [P] Implement structured operational events in `backend/src/observability/events.ts` with the allow-listed `details` keys from `data-model.md`
- [ ] T014 [P] Implement the SQLite connection and migrations in `backend/src/storage/db.ts` for pairing credentials and sessions
- [ ] T015 [P] Define the runtime adapter interface and version constant in `backend/src/runtime/contract.ts` exactly as specified in `contracts/runtime-adapter.md`
- [ ] T016 [P] Implement adapter selection by configuration in `backend/src/runtime/registry.ts`
- [ ] T017 [P] Implement the in-memory fake adapter in `backend/src/runtime/fake/adapter.ts` for tests and browser flows
- [ ] T018 Implement the reusable adapter contract suite in `backend/tests/contract/runtime-adapter.spec.ts` covering all ten conformance items
- [ ] T019 [P] Implement persistent-store inspection in `backend/src/storage/environment.ts` returning `ok`, `missing`, `read-only`, `unsafe` or `inconsistent`
- [ ] T020 Implement the Fastify composition and health endpoint in `backend/src/app.ts`, `backend/src/main.ts` and `backend/src/api/health.ts`
- [ ] T021 [P] Implement pairing credentials in `backend/src/auth/pairing.ts`: 8-digit single-use codes, SHA-256 hash with server pepper, configurable TTL (60–900 s, default 300) and per-source rate limiting
- [ ] T022 [P] Implement sessions in `backend/src/auth/sessions.ts`: 256-bit token, SHA-256 hash, idle TTL (default 43200 s), absolute TTL (default 86400 s), durable revocation
- [ ] T023 Implement bearer authentication and the single-active-session rule in `backend/src/api/middleware.ts`
- [ ] T024 Implement `POST /api/pair`, `DELETE /api/session` and `GET /api/sessions` in `backend/src/api/pairing.ts`
- [ ] T025 Implement the operator CLI skeleton with `status`, `pair` and `session revoke` in `backend/src/cli.ts`
- [ ] T026 [P] Add unit tests for config, logging redaction and migrations in `backend/tests/unit/config.spec.ts`, `backend/tests/unit/logger.spec.ts` and `backend/tests/unit/db.spec.ts`
- [ ] T027 [P] Add unit tests for pairing expiry, single use, rate limiting and session revocation in `backend/tests/unit/auth.spec.ts`
- [ ] T028 Create the integration harness with Docker Compose teardown, readiness waits and `@integration` tagging in `backend/tests/integration/harness.ts`

**Checkpoint**: Configuration, storage, auth and the adapter contract are ready; the fake adapter
passes the contract suite; `GET /api/health` responds.

---

## Phase 3: User Story 1 — Deploy and start the environment (Priority: P1) 🎯 MVP

**Goal**: A developer deploys on Ubuntu 24.04 and sees the Android runtime reach a ready state.

**Independent Test**: On a fresh supported host, run the documented preflight and deploy scripts,
start the stack, and confirm `nexphone status` reports a ready runtime; stop and confirm stopped.

### Tests for User Story 1

- [ ] T029 [P] [US1] Add unit tests for the Redroid container lifecycle with a mocked Dockerode client in `backend/tests/unit/redroid-container.spec.ts`
- [ ] T030 [P] [US1] Add unit tests for readiness polling, timeout and state transitions in `backend/tests/unit/redroid-readiness.spec.ts`
- [ ] T031 [P] [US1] Add an `@integration` test that starts the real runtime and waits for `ready` in `backend/tests/integration/runtime-lifecycle.spec.ts`

### Implementation for User Story 1

- [ ] T032 [P] [US1] Implement the host preflight script checking KVM, binder, ports, disk and memory in `deploy/scripts/preflight.sh`
- [ ] T033 [P] [US1] Create the Compose stack with `gateway`, `runtime` and `caddy` services, health checks and the `data/redroid` bind mount in `deploy/compose.yaml`
- [ ] T034 [P] [US1] Configure local TLS with Caddy's internal CA in `deploy/caddy/Caddyfile`
- [ ] T035 [US1] Implement `validateHost()` and the restricted-capability container specification (no `--privileged`, no Docker socket, no host PID/network namespace) in `backend/src/runtime/redroid/adapter.ts` and `backend/src/runtime/redroid/container.ts`
- [ ] T036 [US1] Implement start, stop, status and the bounded restart policy in `backend/src/runtime/redroid/container.ts`
- [ ] T037 [US1] Implement ADB connection and readiness detection using `sys.boot_completed` with a bounded timeout in `backend/src/runtime/redroid/adb.ts`
- [ ] T038 [US1] Implement capability discovery (Android version, API level, ABI list, display, fps, GPU mode) in `backend/src/runtime/redroid/adapter.ts`
- [ ] T039 [US1] Wire persistent-store inspection into runtime startup so an unsafe store blocks start without deleting data in `backend/src/runtime/redroid/adapter.ts`
- [ ] T040 [US1] Implement `GET /api/runtime`, `POST /api/runtime/start`, `POST /api/runtime/stop` and `POST /api/runtime/restart` in `backend/src/api/runtime.ts`
- [ ] T041 [US1] Implement the `nexphone runtime start|stop|restart` and enhanced `status` commands in `backend/src/cli.ts`
- [ ] T042 [US1] Add Compose health checks and idempotent start/stop scripts in `deploy/scripts/up.sh` and `deploy/scripts/down.sh`
- [ ] T043 [P] [US1] Write deployment documentation in `docs/deployment.md` covering hardware, kernel modules, permissions, ports and configuration
- [ ] T044 [P] [US1] Write operations documentation in `docs/operations.md` covering start, stop, status, restart and logs
- [ ] T045 [US1] Verify the deployment is idempotent by re-running `deploy/scripts/up.sh` without data reset, and record the check in `docs/validation/m0-results.md`

**Checkpoint**: The runtime starts, reports ready, stops cleanly, and survives a second deploy.

---

## Phase 4: User Story 2 — Install and run an application (Priority: P1)

**Goal**: Install an APK, launch it directly without a launcher, and stop it.

**Independent Test**: From a ready runtime, install a pinned sample APK, launch it by package ID,
observe it foregrounded, stop it, and confirm the runtime stays healthy.

### Tests for User Story 2

- [ ] T046 [P] [US2] Add unit tests for ADB output parsing and app error mapping in `backend/tests/unit/redroid-apps.spec.ts`
- [ ] T047 [P] [US2] Add contract tests for install, list, launch and stop against the fake adapter in `backend/tests/contract/app-management.spec.ts`
- [ ] T048 [P] [US2] Add an `@integration` install/launch/stop test in `backend/tests/integration/app-lifecycle.spec.ts`

### Implementation for User Story 2

- [ ] T049 [P] [US2] Add a pinned, permissively licensed sample APK and its checksum to `backend/tests/fixtures/sample.apk` and `backend/tests/fixtures/checksums.txt`
- [ ] T050 [US2] Implement ADB application operations (install, `pm list packages`, launch intent resolution, `am force-stop`) in `backend/src/runtime/redroid/apps.ts`
- [ ] T051 [US2] Map install and launch failures to cause categories `incompatible`, `corrupt`, `not_installed`, `already_running`, `unsupported_capability`, `runtime_unavailable` and `unknown` in `backend/src/runtime/redroid/apps.ts`
- [ ] T052 [US2] Implement application state tracking and `lastError` reporting in `backend/src/runtime/redroid/apps.ts`
- [ ] T053 [US2] Implement `GET /api/apps`, `POST /api/apps` (multipart, 512 MiB limit), `POST /api/apps/{packageId}/launch` and `POST /api/apps/{packageId}/stop` in `backend/src/api/apps.ts`
- [ ] T054 [US2] Implement the `nexphone apps install|list|launch|stop` commands in `backend/src/cli.ts`
- [ ] T055 [US2] Verify launch without a launcher by resolving and starting the launcher intent directly, and record evidence in `docs/validation/m0-results.md`
- [ ] T056 [P] [US2] Write application compatibility and limitation documentation in `docs/compatibility.md` covering Google services, ABIs, integrity checks and hardware features

**Checkpoint**: An application can be installed, launched without a launcher, listed and stopped.

---

## Phase 5: User Story 3 — Connect from a phone and interact (Priority: P1)

**Goal**: Pair from a phone browser, view the live screen, and interact with touch and keyboard.

**Independent Test**: With the runtime ready and an app running, open the client on a phone on the
same LAN, pair, verify the screen, and confirm taps, swipes and typed text reach the app; drop and
restore Wi-Fi and confirm reconnection.

### Tests for User Story 3

- [ ] T057 [P] [US3] Add unit tests for WebSocket message validation, auth handshake and close codes in `backend/tests/unit/ws-protocol.spec.ts`
- [ ] T058 [P] [US3] Add unit tests for input coordinate bounds and text length limits in `backend/tests/unit/input.spec.ts`
- [ ] T059 [P] [US3] Add Playwright end-to-end tests for pairing, screen rendering and input against the fake adapter in `client/tests/e2e/session.spec.ts`
- [ ] T060 [P] [US3] Add an `@integration` streaming test that measures p50/p95 input-to-display latency in `backend/tests/integration/streaming.spec.ts`

### Implementation for User Story 3

- [ ] T061 [US3] Implement the scrcpy server lifecycle and video/control channel bridge in `backend/src/runtime/redroid/streaming.ts`
- [ ] T062 [US3] Implement Annex B H.264 packet production with keyframe metadata in `backend/src/remote/video.ts`
- [ ] T063 [US3] Implement input translation for tap, swipe, scroll, key and text, rejecting out-of-bounds coordinates in `backend/src/remote/input.ts`
- [ ] T064 [US3] Implement the WebSocket route with first-message auth, 5-second authentication timeout, single-session enforcement and close codes 4401/4408/4409/4410/4429 in `backend/src/api/stream.ts`
- [ ] T065 [US3] Implement video forwarding with latest-frame-wins backpressure, keyframe recovery and `video_config` emission in `backend/src/api/stream.ts`
- [ ] T066 [US3] Implement input rate limiting and validation in `backend/src/api/stream.ts`
- [ ] T067 [US3] Implement per-session latency instrumentation in `backend/src/remote/protocol.ts` and expose it in status
- [ ] T068 [US3] Implement `DELETE /api/session` revocation propagation to active WebSockets in `backend/src/auth/sessions.ts` and `backend/src/api/stream.ts`
- [ ] T069 [US3] Scaffold the client shell, routing and typed API client in `client/src/App.tsx` and `client/src/api/client.ts`
- [ ] T070 [US3] Implement the pairing screen and token handling in `client/src/session/pairing.tsx`
- [ ] T071 [US3] Implement connection state, bounded exponential backoff and reconnect in `client/src/session/reconnect.ts`
- [ ] T072 [US3] Implement H.264 decoding with WebCodecs and the tinyh264 fallback in `client/src/stream/decoder.ts`
- [ ] T073 [US3] Implement pointer, gesture and keyboard capture with correct scaling after rotation or resize in `client/src/input/capture.ts`
- [ ] T074 [US3] Implement client error and reconnection UI in `client/src/ui/ConnectionStatus.tsx`
- [ ] T075 [US3] Document certificate trust and phone pairing in `docs/operations.md`
- [ ] T076 [US3] Ensure the gateway serves the built client over TLS in `backend/src/app.ts` and `deploy/caddy/Caddyfile`

**Checkpoint**: A phone pairs, sees the live screen, controls the app, reconnects, and is revoked
immediately.

---

## Phase 6: User Story 4 — Keep application data across restarts (Priority: P2)

**Goal**: Application data survives runtime restarts and normal host reboots; unsafe storage fails
safely.

**Independent Test**: Create data in the sample app, restart the runtime, relaunch and verify the
data; repeat after a host reboot.

### Tests for User Story 4

- [ ] T077 [P] [US4] Add unit tests for storage states `missing`, `read-only`, `unsafe` and `inconsistent` in `backend/tests/unit/storage.spec.ts`
- [ ] T078 [P] [US4] Add an `@integration` persistence test across runtime restart in `backend/tests/integration/persistence.spec.ts`
- [ ] T079 [P] [US4] Add a scripted host-reboot persistence check in `backend/tests/integration/reboot-persistence.sh`

### Implementation for User Story 4

- [ ] T080 [US4] Implement the startup storage guard that refuses to start on a missing, read-only or unsafe store and never deletes or reinitializes a non-empty store in `backend/src/storage/environment.ts`
- [ ] T081 [US4] Surface storage state and last check time in `GET /api/status` in `backend/src/api/status.ts`
- [ ] T082 [US4] Detect an unclean shutdown from `lastSafeStopAt` and enter read-only diagnostic mode when an inconsistent store is suspected in `backend/src/storage/environment.ts`
- [ ] T083 [US4] Add a persistence verification fixture (create a note, restart, read it back) in `backend/tests/fixtures/persistence-check.md`
- [ ] T084 [US4] Document backup, restore and data ownership expectations in `docs/operations.md`

**Checkpoint**: Data survives runtime restart and host reboot; unsafe storage fails safely.

---

## Phase 7: User Story 5 — Understand and recover from failures (Priority: P2)

**Goal**: Runtime, authentication and storage failures produce distinct, actionable messages and
logs.

**Independent Test**: Inject a runtime crash, invalid pairing and storage permission failure, then
verify distinct messages and log entries for each.

### Tests for User Story 5

- [ ] T085 [P] [US5] Add failure-injection integration tests for runtime crash, invalid pairing and storage denial in `backend/tests/integration/failures.spec.ts`
- [ ] T086 [P] [US5] Add unit tests asserting tokens, pairing codes and screen content never appear in logs in `backend/tests/unit/redaction.spec.ts`
- [ ] T087 [P] [US5] Add unit tests for remediation mapping and correlation IDs in `backend/tests/unit/errors.spec.ts`

### Implementation for User Story 5

- [ ] T088 [US5] Complete the operational event taxonomy for deployment, lifecycle, app, auth, connection and session events in `backend/src/observability/events.ts`
- [ ] T089 [US5] Implement crash detection, bounded restart and `lastError` propagation to status and WebSocket clients in `backend/src/runtime/redroid/container.ts` and `backend/src/api/stream.ts`
- [ ] T090 [US5] Implement the error-to-remediation mapping used by the API and CLI in `backend/src/runtime/errors.ts`
- [ ] T091 [US5] Add correlation IDs to requests and sessions in `backend/src/api/middleware.ts` and `backend/src/observability/logger.ts`
- [ ] T092 [US5] Implement configurable log retention and rotation in `backend/src/observability/logger.ts`
- [ ] T093 [US5] Implement distinct CLI and client failure displays for runtime, auth and storage errors in `client/src/ui/ConnectionStatus.tsx` and `backend/src/cli.ts`
- [ ] T094 [P] [US5] Write troubleshooting guidance in `docs/troubleshooting.md` mapping failure symptoms to remediation

**Checkpoint**: Every injected failure is legible in status, logs and the client without source
access.

---

## Phase 8: User Story 6 — Replace the runtime implementation (Priority: P3)

**Goal**: Demonstrate that a second adapter can operate the platform without touching the client or
unrelated backend code.

**Independent Test**: Run the platform with the alternative adapter through configuration only;
confirm the contract suite passes and the client works.

### Tests for User Story 6

- [ ] T095 [P] [US6] Add a static boundary test that fails if runtime-specific strings appear outside `backend/src/runtime/redroid/` in `backend/tests/unit/boundary.spec.ts`
- [ ] T096 [P] [US6] Add an isolation test asserting `Privileged=false`, no Docker socket and no host PID/network namespace in `backend/tests/integration/isolation.spec.ts`
- [ ] T097 [P] [US6] Add a contract-version compatibility test accepting `^1.0.0` and rejecting incompatible adapters in `backend/tests/unit/adapter-version.spec.ts`

### Implementation for User Story 6

- [ ] T098 [US6] Implement a second adapter (in-memory mock) in `backend/src/runtime/mock/adapter.ts` that passes the full contract suite
- [ ] T099 [US6] Add a Compose/profile or configuration switch that runs the platform with the alternative adapter in `deploy/compose.mock.yaml`
- [ ] T100 [US6] Add the isolation verification script used by the deployment check in `deploy/scripts/check-isolation.sh`
- [ ] T101 [US6] Write the ADR for the runtime adapter contract and versioning in `docs/adr/0002-runtime-adapter-contract.md`
- [ ] T102 [US6] Write the ADR recording the isolation decision and minimal capability set from the Phase 0 spike in `docs/adr/0003-runtime-isolation.md`
- [ ] T103 [P] [US6] Write an adapter authoring guide in `docs/adapter-guide.md`

**Checkpoint**: The platform runs against two adapters, the boundary test passes, and isolation is
verified empirically.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Hardening, measurement and final validation across stories.

- [ ] T104 [P] Perform a security review of TLS, headers, auth rate limits, container capabilities and file permissions in `docs/security-review.md`
- [ ] T105 [P] Audit dependencies and licenses, pin runtime image digests, and record results in `docs/dependencies.md`
- [ ] T106 [P] Record the measured latency baseline, frame rate, resource use and reference hardware in `docs/performance.md`
- [ ] T107 [P] Improve client usability and accessibility (focus states, labels, touch target sizes) in `client/src/ui/`
- [ ] T108 Run the complete `quickstart.md` validation on the reference host and record results in `docs/validation/m0-results.md`
- [ ] T109 Update `README.md` and `CONTRIBUTING.md` with M0 run instructions and known limitations
- [ ] T110 Remove dead code, resolve TODO markers, and run typecheck, lint and all non-integration tests across `backend/` and `client/`
- [ ] T111 Run the full integration suite including real runtime, persistence, streaming and isolation, and record the outcome in `docs/validation/m0-results.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks every user story.
- **US1 (Phase 3)**: Depends on Foundational. Establishes the runtime and status surface.
- **US2 (Phase 4)**: Depends on Foundational and US1 (needs a ready runtime).
- **US3 (Phase 5)**: Depends on Foundational and US1 (needs the runtime and a running app).
- **US4 (Phase 6)**: Depends on US1 and US2 (needs app data).
- **US5 (Phase 7)**: Depends on US1 and US3 (needs status, logs and live sessions).
- **US6 (Phase 8)**: Depends on Foundational and US1 (needs a real adapter to contrast with).
- **Polish (Phase 9)**: Depends on all stories intended for release.

### User Story Dependencies

- **US1 (P1)**: No story dependencies; first deliverable.
- **US2 (P1)**: Requires US1.
- **US3 (P1)**: Requires US1; US2 provides the app used in interaction tests but the screen and
  input can be validated against the system UI.
- **US4 (P2)**: Requires US1 and US2.
- **US5 (P2)**: Requires US1 and US3.
- **US6 (P3)**: Requires the contract and fake adapter from Foundational; the real adapter from US1
  makes the boundary test meaningful.

### Within Each Story

- Tests are written first and must fail before implementation.
- Models and contracts before services; services before endpoints; endpoints before client.
- Story complete and validated before starting the next priority when working sequentially.

### Parallel Opportunities

- Setup tasks marked [P] touch independent files.
- Foundational tasks T011–T017, T019, T021, T022, T026 and T027 are parallel-safe once T010 lands.
- US1: T029–T031 (tests) and T032–T034, T043–T044 (infrastructure/docs) can run in parallel.
- US2: T046–T049 and T056 run in parallel; app operations T050–T052 are sequential within one file.
- US3: T057–T060 run in parallel; backend streaming (T061–T068) and client work (T069–T074) can be
  split between two developers.
- US4: T077–T079 run in parallel; T080–T082 share `environment.ts` and are sequential.
- US5: T085–T087 run in parallel; T088–T093 are mostly independent files.
- US6: T095–T097 and T101–T103 run in parallel; T098–T100 are sequential.
- Polish: T104–T107 and T109 run in parallel.

---

## Parallel Example: User Story 1

```bash
# Tests first (independent files)
Task: "Add unit tests for the Redroid container lifecycle in backend/tests/unit/redroid-container.spec.ts"
Task: "Add unit tests for readiness polling in backend/tests/unit/redroid-readiness.spec.ts"
Task: "Add an integration test for runtime lifecycle in backend/tests/integration/runtime-lifecycle.spec.ts"

# Infrastructure in parallel
Task: "Implement the host preflight script in deploy/scripts/preflight.sh"
Task: "Create the Compose stack in deploy/compose.yaml"
Task: "Configure local TLS in deploy/caddy/Caddyfile"
Task: "Write deployment documentation in docs/deployment.md"
```

## Parallel Example: User Story 3

```bash
# Backend stream track
Task: "Implement the scrcpy bridge in backend/src/runtime/redroid/streaming.ts"
Task: "Implement the WebSocket route in backend/src/api/stream.ts"

# Client track
Task: "Implement the video decoder in client/src/stream/decoder.ts"
Task: "Implement input capture in client/src/input/capture.ts"
Task: "Implement reconnect handling in client/src/session/reconnect.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational — do not skip; the adapter contract, auth and config block
   everything.
3. Complete Phase 3: US1 and the Phase 0 hard gates from `research.md` (isolation, binder, boot,
   readiness).
4. **STOP and VALIDATE**: run `quickstart.md` sections 0–3. Do not proceed if the isolation gate
   fails; switch to a VM-isolated runtime first.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → deploy/start/status demo (MVP slice).
3. US2 → install/launch/stop demo; this is the smallest demonstrable Android environment.
4. US3 → phone pairing and interaction; this completes the M0 value proposition.
5. US4 → persistence guarantees.
6. US5 → diagnosability.
7. US6 → replaceability proof and ADRs.
8. Polish → baseline, hardening, full quickstart run.

### Parallel Team Strategy

- Two developers: one owns backend/runtime (US1, US2, US4, US6), the other owns the client and
  streaming (US3, US5 UI); converge on integration tests.
- Complete Setup and Foundational together before splitting.
- US3 backend and client tracks can proceed in parallel once the WebSocket contract is fixed.

---

## Notes

- [P] tasks touch different files and have no dependency on an incomplete task.
- Integration tests (`@integration`) require a KVM-capable host with binder; they are excluded from
  default CI as decided in `research.md` R14.
- The Phase 0 hard gates in `research.md` are blocking: if the isolation gate fails, do not start
  US1 implementation; evaluate a VM-isolated runtime first.
- No task may introduce `--privileged`, a cloud dependency, an external LLM or multi-user support.
- Commit after each task or logical group; stop at each checkpoint to validate independently.
