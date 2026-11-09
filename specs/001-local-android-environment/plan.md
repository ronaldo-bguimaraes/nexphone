# Implementation Plan: NexPhone M0 — Local Virtual Android Environment

**Branch**: `001-local-android-environment` | **Date**: 2026-11-09 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-local-android-environment/spec.md`

## Summary

Deliver a working M0 prototype that runs a persistent Android environment on an Ubuntu 24.04 host
and is usable from a phone browser on the same LAN. The plan uses a TypeScript control plane
(Node.js + Fastify) and a React web client, a documented runtime adapter with a provisional Redroid
implementation, scrcpy-based H.264 streaming decoded with WebCodecs (tinyh264 fallback), input
injection over the scrcpy control channel, a host bind mount for persistent Android data, pairing-
token authentication, TLS via Caddy, and structured status/logging.

The AI Engine is deliberately absent. All remote-access authorization is enforced in the gateway,
outside any model. The runtime adapter is the only place where Redroid-specific details are allowed.

## Technical Context

**Language/Version**: TypeScript 5.6 on Node.js 22 LTS; React 18.3 for the web client; Bash for
deployment preflight.

**Primary Dependencies**: Fastify 5, `@fastify/websocket`, `@fastify/static`, Zod, Pino, Dockerode,
Better-SQLite3, `@yume-chan/adb`, `@yume-chan/scrcpy`,
`@yume-chan/scrcpy-decoder-webcodecs`, `@yume-chan/scrcpy-decoder-tinyh264`, React, Vite, Vitest,
Playwright, Caddy 2, scrcpy-server (Apache-2.0), Android platform-tools, Redroid (provisional).

**Storage**: Host bind mount `data/redroid` mounted at `/data` in the runtime; SQLite at
`data/state/nexphone.db` for pairing credentials and sessions; YAML configuration validated by Zod.

**Testing**: Vitest for unit and adapter contract tests; a reusable runtime-adapter contract suite;
Playwright for browser end-to-end tests against a fake adapter and, on a KVM-capable host, the real
runtime; integration tests marked `@integration` and excluded from default CI.

**Target Platform**: Ubuntu 24.04 LTS x86_64, Docker Engine 27+ with Compose v2, hardware
virtualization (KVM), optional `/dev/dri` for GPU-assisted rendering.

**Project Type**: Web application (backend service + browser client) with local deployment
artifacts.

**Performance Goals**: No target is invented. M0 measures input-to-display latency per session and
records the distribution. Working hypothesis to validate in Phase 0: median ≤150 ms and p95 ≤300 ms
on a wired 1 GbE LAN at 720p/30 fps with GPU or software rendering. The measured baseline becomes
the M0 acceptance threshold before implementation starts.

**Constraints**: Single host, single runtime instance, single user, single active session; LAN-only
binding by default; no internet, cloud account, external LLM or third-party API required after
setup; no Kubernetes, multi-tenancy or public-internet exposure.

**Scale/Scope**: One Android environment, 720×1280 at up to 30 fps, up to roughly ten installed
applications, one interactive client, a handful of concurrent status requests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate | Status |
|---|-----------|------|--------|
| 1 | Open Source and User Sovereignty | Every component is OSS and self-hostable; no mandatory paid service; licenses checked. Redroid, Caddy, scrcpy and Node dependencies are permissively licensed. | PASS |
| 2 | Local-First Architecture | Runs entirely on the user's Ubuntu host; runtime works without WAN after setup; no cloud dependency. | PASS |
| 3 | Separation of Core Subsystems | Gateway, client and runtime adapter have explicit contracts. The AI Engine is absent; the client talks only to the gateway API, never to runtime internals. | PASS |
| 4 | Runtime Abstraction and Replaceability | A versioned adapter contract is the only integration point; adapter selected by configuration; a fake adapter and contract suite prove replaceability. | PASS |
| 5 | Application-Centric Android Environment | Direct package installation and launch by identifier; no launcher required; framework services retained. | PASS |
| 6 | General-Purpose Computer Use | Not implemented in M0 (AI Engine out of scope). No violation; the runtime still exposes screen and input for a future engine. | PASS (N/A) |
| 7 | AI-Native Interaction | Deferred by design; M0 delivers the execution and remote-interaction foundation only. | PASS (N/A) |
| 8 | Model Independence | No model or inference engine is used in M0. | PASS (N/A) |
| 9 | User Control and Action Authorization | Pairing and session authorization are enforced in the gateway, outside any AI. No automated consequential actions exist in M0. | PASS |
| 10 | Privacy and Security by Design | TLS, authenticated sessions, redacted logs, least-privilege mounts, LAN-only default. **Hard gate:** the runtime MUST run with a restricted capability set, not unrestricted host privileges. If the provisional runtime cannot, it is rejected and a VM-isolated alternative is evaluated. | PASS WITH GATE |
| 11 | Persistent and Reliable Environments | Host-backed persistent storage, safe startup when storage is unavailable, health reporting, bounded restart policy and documented backup expectations. | PASS |
| 12 | Modular and Extensible Engineering | Clear module boundaries: `api`, `runtime`, `remote`, `auth`, `storage`. Contract-first adapter; no speculative abstraction beyond the required adapter boundary. | PASS |
| 13 | Incremental and Testable Development | Single-session, single-runtime M0; no distributed infrastructure; every requirement maps to automated or scripted validation. | PASS |
| 14 | Interoperability and Standards | HTTP/OpenAPI, WebSocket, TLS, ADB, H.264, SQLite and YAML are established interfaces; custom messages are documented and versioned. | PASS |

**Gate outcome**: PASS, with the isolation gate on Principle 10 and the latency baseline pending
Phase 0 measurement. No constitutional violation requires justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-local-android-environment/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── runtime-adapter.md
│   ├── openapi.yaml
│   ├── websocket.md
│   └── config.schema.json
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md             # Phase 2 output (/speckit.tasks) — not created here
```

### Source Code (repository root)

```text
backend/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── main.ts                      # process entry point
│   ├── app.ts                       # Fastify composition
│   ├── config/
│   │   ├── schema.ts                # Zod config schema
│   │   └── load.ts
│   ├── api/
│   │   ├── status.ts                # GET /api/status, /api/health
│   │   ├── pairing.ts               # POST /api/pair, DELETE /api/session
│   │   ├── runtime.ts               # start/stop/restart and capabilities
│   │   ├── apps.ts                  # install/list/launch/stop
│   │   └── stream.ts                # WebSocket upgrade and session binding
│   ├── auth/
│   │   ├── pairing.ts               # code issue/consume, rate limiting
│   │   └── sessions.ts              # token issue/validate/revoke
│   ├── runtime/
│   │   ├── contract.ts              # RuntimeAdapter interface + version
│   │   ├── registry.ts              # adapter selection from configuration
│   │   ├── errors.ts                # normalized adapter errors
│   │   └── redroid/
│   │       ├── adapter.ts
│   │       ├── container.ts         # Dockerode lifecycle
│   │       ├── adb.ts               # readiness, apps, shell commands
│   │       └── streaming.ts         # scrcpy server bridge
│   ├── remote/
│   │   ├── protocol.ts              # WebSocket message schema
│   │   ├── input.ts                 # touch/key/text translation
│   │   └── video.ts                 # H.264 frame forwarding
│   ├── storage/
│   │   ├── db.ts                    # SQLite migrations and access
│   │   └── environment.ts           # storage path checks
│   ├── observability/
│   │   ├── logger.ts                # Pino configuration and redaction
│   │   └── events.ts
│   └── cli.ts                       # operator CLI (status, pair, runtime, apps)
└── tests/
    ├── unit/
    ├── contract/
    ├── integration/
    └── fixtures/

client/
├── package.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/                          # typed HTTP client
    ├── session/                      # pairing, token storage, reconnect
    ├── stream/                       # WebCodecs/tinyh264 playback
    ├── input/                        # pointer and keyboard capture
    └── ui/                           # connection state, errors, controls

deploy/
├── compose.yaml
├── .env.example
├── caddy/
│   └── Caddyfile
└── scripts/
    ├── preflight.sh
    ├── up.sh
    └── down.sh

docs/
├── adr/                              # existing ADR log
├── deployment.md
├── operations.md
└── compatibility.md

data/                                 # runtime state (gitignored)
├── redroid/                          # Android /data bind mount
└── state/nexphone.db
```

**Structure Decision**: A web-application monorepo with three deployable pieces (backend, web
client, runtime container) plus a TLS proxy. The backend is the only component allowed to know about
runtime specifics. The client consumes the HTTP/WebSocket contract only. Contract documents under
`specs/001-local-android-environment/contracts/` are the source of truth for both.

## Phase 0 — Research Output

See [research.md](./research.md). Key decisions:

- Provisional runtime: Redroid 14 (`redroid/redroid:14.0.0_64only-latest`) on Docker, contingent on
  the isolation and kernel-module gates.
- Streaming: scrcpy server H.264 Annex B bridged to the browser; WebCodecs decode with tinyh264
  fallback; input over the scrcpy control protocol.
- Control plane: Node.js 22 + TypeScript + Fastify; SQLite for pairing/session state.
- Deployment: Docker Compose with pinned image digests; Caddy for local TLS.
- Isolation: restricted capability set instead of `--privileged`; if impossible, reject Redroid and
  evaluate a VM-isolated Android runtime before implementation.

## Phase 1 — Design Output

- [data-model.md](./data-model.md): entities, fields, relationships, validation and state machines.
- [contracts/runtime-adapter.md](./contracts/runtime-adapter.md): versioned adapter interface.
- [contracts/openapi.yaml](./contracts/openapi.yaml): local HTTP API.
- [contracts/websocket.md](./contracts/websocket.md): streaming and input protocol.
- [contracts/config.schema.json](./contracts/config.schema.json): configuration contract.
- [quickstart.md](./quickstart.md): end-to-end validation guide.

## Post-Design Constitution Check

*Re-evaluated after Phase 1 design.*

| Principle | Re-check result |
|-----------|-----------------|
| 1 Open source | PASS — all chosen dependencies are permissively licensed; pinning and checksum verification are in the deployment contract. |
| 2 Local-first | PASS — Compose deployment and LAN-only operation; no cloud path in the design. |
| 3 Subsystem separation | PASS — client uses only the HTTP/WS contract; adapter contract isolates the runtime. |
| 4 Runtime replaceability | PASS — contract, registry, fake adapter and contract suite are design artifacts. |
| 5 Application-centric | PASS — install/launch/stop by package identifier; no launcher dependency. |
| 6–8 AI principles | PASS (N/A) — AI Engine remains out of scope. |
| 9 User control | PASS — gateway-enforced pairing and session revocation; no AI in the authorization path. |
| 10 Privacy and security | PASS WITH GATE — isolation gate remains open until the Phase 0 spike proves a restricted runtime configuration. |
| 11 Persistence | PASS — bind-mounted `/data`, startup storage checks and safe failure are designed. |
| 12 Modularity | PASS — modules and the single adapter boundary are explicit. |
| 13 Incremental | PASS — scope is a single-runtime, single-session prototype with contract tests. |
| 14 Interoperability | PASS — OpenAPI, WebSocket, TLS, ADB, H.264 and SQLite are standard interfaces. |

**Design gate outcome**: PASS. The only unresolved item is empirical: the runtime isolation gate and
the latency baseline from Phase 0. Both are explicit pass/fail criteria for the first implementation
task, not silent assumptions.

## Complexity Tracking

No constitutional violations. The single externally justified complexity is the runtime adapter
boundary, which is mandated by Principle 4 and is the minimum needed to keep the runtime
replaceable.
