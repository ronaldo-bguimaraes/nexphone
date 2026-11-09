# Phase 0 Research — NexPhone M0

**Feature**: `001-local-android-environment`
**Date**: 2026-11-09
**Status**: Decisions recorded; empirical validation pending the Phase 0 spike.

## Method and confidence labels

Research combined the project constitution and specification with public runtime, streaming and
browser documentation. No code exists yet, and no hardware spike has been executed. Findings are
therefore labelled:

- **Verified** — documented behavior from an authoritative source and consistent across sources.
- **Assumed** — plausible and widely reported, but not confirmed on the target baseline.
- **Unverified** — must be settled by the spike before implementation commitments.

Every unverified item has an explicit exit criterion below.

## R1 — Runtime candidate

**Decision**: Use Redroid 14 (`redroid/redroid:14.0.0_64only-latest`, x86_64) as the provisional
runtime behind the adapter contract. Do not commit to it permanently.

**Rationale**: Redroid runs Android directly on the host kernel inside a container, supports
persistent `/data`, exposes ADB, and is widely used for Android-in-Docker deployments. Android 14
images are published for x86_64. It is the fastest way to validate the architecture without
building an Android distribution.

**Alternatives considered**:

- **Waydroid**: strong desktop integration, but requires host packages and is not designed for
  remote/browser access; less isolated from the host desktop session.
- **Cuttlefish**: AOSP's virtual-device target; runs in a VM, giving better isolation, but has
  heavier host requirements and a more complex image workflow.
- **Android emulator (AOSP)**: mature and isolated in a VM, but heavier and less convenient to
  automate on a headless host.
- **Custom AOSP build**: explicitly out of scope for M0.

**Validation needed**: boot to `sys.boot_completed=1` on Ubuntu 24.04 with the provisional kernel
modules, install and launch a sample APK, survive a container restart with `/data` intact, and pass
the isolation gate in R3.

## R2 — Kernel features and permissions

**Decision**: Require `binder` (binderfs or the `binder_linux` module) and enable `memfd` for
shared memory instead of relying on `ashmem`. Document `linux-modules-extra-$(uname -r)` as the
installation source when the module is packaged, plus the binderfs mount. Treat KVM as required by
the documented baseline even if the chosen runtime is container-based, because it is required by
the fallback VM-based runtime and by the hardware baseline.

**Rationale**: Redroid uses the host kernel and needs binder IPC. `ashmem_linux` was removed from
mainline kernels around 5.18; newer Redroid versions use `memfd` when
`androidboot.use_memfd=true`. Ubuntu 24.04 ships a 6.8 kernel, so `ashmem` must not be assumed.

**Verified**: binder is required by Redroid; `ashmem` is optional/deprecated on modern kernels;
`memfd` is the supported replacement.

**Assumed**: Ubuntu 24.04's `linux-modules-extra` provides `binder_linux` for the reference kernel;
the exact module package name must be confirmed on the reference host.

**Alternatives considered**: DKMS-built binder modules (more fragile), a custom kernel (out of
scope), a VM-based runtime that does not need host binder (fallback).

**Validation needed**: `modprobe binder_linux devices=binder,hwbinder,vndbinder` succeeds, the
binderfs mount exists, and Android boots with `use_memfd=true`.

## R3 — Isolation gate (blocking)

**Decision**: The runtime MUST NOT run with Docker `--privileged`. The adapter must start it with a
restricted set of Linux capabilities, devices and mounts. If Redroid cannot boot in that
configuration, Redroid is rejected for M0 and a VM-isolated runtime (Cuttlefish or AOSP emulator)
is evaluated instead.

**Rationale**: The constitution forbids unrestricted host privileges for Android instances and
requires host access to be restricted. `--privileged` disables that boundary. Many public Redroid
recipes use `--privileged`, so this is the highest-risk architectural assumption in M0.

**Alternatives considered**:

- Accept `--privileged` for M0 and tighten later: rejected — it violates Principle 10 and sets an
  unsafe precedent.
- Rootless container: promising, but binder and mount operations may still require capabilities;
  must be tested.
- VM-based runtime: stronger isolation by construction, at the cost of CPU/memory and startup time.

**Validation needed**: boot and app launch with the minimum capability set, with no host
`/var/run/docker.sock`, no host PID/network namespace, read-only host mounts except the documented
data volume, and no access to host devices beyond the explicitly mapped graphics device if used.
Record the exact capability list in an ADR. This is a hard gate before implementation.

## R4 — Graphics and acceleration

**Decision**: Default to software rendering (`androidboot.redroid_gpu_mode=guest`) for the
reference configuration. GPU passthrough is an optional optimization enabled only when
`/dev/dri/renderD*` is present and compatible. Never make GPU acceleration a requirement.

**Rationale**: Redroid can use host GPUs through `/dev/dri`, but compatibility varies (notably with
NVIDIA) and a headless server may have no GPU. Software rendering is slower but portable and keeps
the deployment reproducible. The spec forbids inventing performance targets; the spike will measure
both modes where hardware permits.

**Verified**: `gpu_mode` accepts `auto`, `host` and `guest`; `guest` means software rendering; host
GPU access requires device passthrough.

**Alternatives considered**: requiring a GPU (excludes many hosts), virtio-gpu inside a VM
(possible fallback, more setup).

**Validation needed**: measure frame rate and input latency with software rendering at 720×1280,
30 fps; document the minimum host CPU. Test GPU mode only if the reference host exposes a
compatible render node.

## R5 — Android version and application compatibility

**Decision**: Target Android 14 (API 34), x86_64, with the published native-bridge properties so
common ARM-only applications can run. Treat the exact image tag as pinned by digest.

**Rationale**: Android 14 images are published and reported working on Ubuntu 24.04-class hosts.
Native bridging (libndk/houdini) improves compatibility for ARM APKs, but is proprietary-adjacent
in some variants; the 64-bit-only public image should be evaluated first, and any native-bridge
image must be license-reviewed before use.

**Alternatives considered**: Android 12 or 13 for maturity; 64-bit-only without native bridge for a
cleaner license story. The spike will choose the most compatible image that passes licensing review.

**Validation needed**: install and launch a representative open-source APK, confirm ABI support,
and record which classes of applications fail (for example, those requiring Google Play Services or
Play Integrity).

## R6 — Screen streaming

**Decision**: Use scrcpy-server to capture and encode H.264 Annex B, bridge the stream from the
gateway to the browser over WebSocket, and decode it with the WebCodecs `VideoDecoder`. Use the
tinyh264 WebAssembly decoder as a fallback when WebCodecs or H.264 hardware decode is unavailable.
Stream at 720×1280, up to 30 fps, with a configurable bitrate.

**Rationale**: scrcpy is mature, Apache-2.0, low-latency, and already separates video and control
channels. Its server emits Annex B H.264, which WebCodecs decodes directly. WebCodecs is supported
by Chromium-based Android browsers; tinyh264 covers the remaining browsers without a second server
path. A JPEG polling design was rejected because `screencap` round-trips are slow and produce poor
interactive latency.

**Verified**: scrcpy-server emits Annex B H.264; WebCodecs supports Annex B; H.264 decode is the
most broadly supported WebCodecs path.

**Assumed**: a Node.js bridge can consume scrcpy's video and control sockets reliably using the
`@yume-chan/scrcpy` packages; Chrome/Edge on Android supports WebCodecs H.264 at 720p30.

**Alternatives considered**:

- **JPEG over WebSocket** (`screencap` loop): simplest, but latency and frame rate are poor; keep as
  a diagnostic fallback only.
- **MJPEG over HTTP**: simple but bandwidth-heavy and still limited by capture rate.
- **WebRTC**: lowest latency at scale, but adds signaling, ICE and NAT complexity that M0 does not
  need on a LAN.
- **VNC/noVNC**: easy browser client, but touch and gesture semantics are weak and the Android VNC
  server adds another component.
- **MSE with fMP4**: more universal than WebCodecs, but requires muxing; deferred.

**Validation needed**: end-to-end measurement of input-to-display latency at p50/p95, browser
compatibility matrix, behavior on network loss, and CPU cost of software H.264 encoding.

## R7 — Input forwarding

**Decision**: Send touch, multi-touch, scroll, key and text events through the scrcpy control
protocol. Translate browser pointer events into Android coordinates using the negotiated video
dimensions. Use `adb shell input` only as a diagnostic fallback.

**Rationale**: scrcpy's control channel is low-latency, supports gestures and text, and avoids
spawning a process per input event. `adb shell input` is simple but slow and limited for gestures.

**Alternatives considered**: per-event `adb shell input` (too slow), an in-Android accessibility
agent (extra APK, broader permissions), VNC pointer events (no true multi-touch).

**Validation needed**: tap, long-press, swipe, scroll, pinch (if supported), hardware keyboard and
soft-keyboard text entry; verify coordinate mapping under rotation and different resolutions.

## R8 — Persistent storage

**Decision**: Bind-mount a host directory (`data/redroid`) to `/data` in the runtime container and
document it as the persistent environment store. Validate existence, ownership and writability
before starting the runtime. Do not auto-delete or reinitialize a non-empty store on failure.

**Rationale**: Redroid persists Android user data under `/data`; a host bind mount makes it
inspectable, backup-friendly and independent of container lifecycle. Startup checks prevent silent
data loss when permissions or mounts are wrong.

**Alternatives considered**: Docker named volumes (less transparent for backups), keeping data in
the container (lost on recreation).

**Validation needed**: create app data, restart the container, restart the host, confirm data
survives; simulate a read-only or missing directory and confirm safe failure; test an unclean
container kill and document recovery behavior.

## R9 — Authentication and pairing

**Decision**: The host issues a short-lived, single-use pairing code (8 digits, 5-minute expiry,
maximum 5 attempts per minute per source). A successful exchange returns a 256-bit session token.
Only a SHA-256 hash of the token and code is stored. Sessions expire after 12 hours of inactivity
and 24 hours absolute, and can be revoked. WebSocket clients authenticate with a first message over
the encrypted channel, not a URL query parameter.

**Rationale**: A single-user, local-first deployment does not need accounts or an identity provider.
A pairing code is easy to transfer from the host terminal to the phone, while hashed tokens limit
the impact of state-file disclosure. Keeping tokens out of URLs avoids leaking them into logs and
browser history.

**Alternatives considered**: username/password (account management overhead), mTLS (strongest but
painful on a phone browser), OAuth (requires an external provider or extra infrastructure).

**Validation needed**: expiry, rate limiting, replay rejection, revocation, and confirmation that
no secret appears in logs or error messages.

## R10 — Transport security and certificates

**Decision**: Terminate TLS in Caddy using its internal certificate authority, and document how to
install the local root certificate on the phone. Reject plaintext HTTP for session and API traffic.

**Rationale**: Browsers require a trusted certificate for WebCodecs/WebSocket pages in practice,
and a local CA gives a stable trust anchor without public DNS. Caddy automates certificate
issuance and rotation. Installing the root certificate is an explicit, documented trust step, which
satisfies the requirement that unverified certificates are not silently accepted.

**Alternatives considered**: self-signed per-host certificates (renewal and trust friction), public
Let's Encrypt certificates (require a public domain and internet), plain HTTP (violates the
constitution and leaks credentials).

**Validation needed**: confirm the phone browser accepts the certificate after the documented trust
step, and that an untrusted certificate produces an explicit warning rather than silent acceptance.

## R11 — Deployment mechanism

**Decision**: Docker Compose with three services (`gateway`, `runtime`, `caddy`), pinned image
digests, a `.env` file for configuration, and preflight/up/down scripts. No Kubernetes, no
orchestrator, no cloud resources.

**Rationale**: Compose is the smallest reproducible multi-container deployment on a single Ubuntu
host. It expresses dependencies, health checks and volumes clearly and is familiar to self-hosters.

**Alternatives considered**: systemd units (possible later for boot start), Podman Compose (should
work but is a secondary target), bare processes (harder to isolate), Kubernetes (explicitly out of
scope).

**Validation needed**: clean-host deployment from documentation, idempotent re-run, start/stop, and
recovery after `docker compose down` without data loss.

## R12 — Control-plane stack

**Decision**: Node.js 24 LTS with TypeScript, Fastify 5, Zod, Pino, Dockerode and Node's built-in
`node:sqlite` (the Better-SQLite3 native module did not build on the reference Node.js version).
The web client uses React 18 with Vite and TypeScript.

**Rationale**: The hardest part of M0 is bridging ADB, scrcpy video/control and WebSocket to a
browser. The `@yume-chan` ecosystem provides maintained TypeScript implementations of ADB and the
scrcpy protocol for Node and browsers, reducing custom protocol work. One language across gateway
and client lowers overhead. Node's I/O model suits many concurrent streams, even though M0 only
needs one.

**Alternatives considered**:

- **Python/FastAPI**: excellent for the future AI Engine and testing, but would require a custom
  scrcpy bridge or extra subprocess glue.
- **Go**: strong concurrency and single-binary deployment, but a smaller ecosystem for scrcpy
  protocol handling and slower iteration for the web client.
- **Rust**: best performance, highest implementation cost for an M0 prototype.

The AI Engine remains a separate subsystem and may use a different language later; this choice does
not couple it.

**Validation needed**: prove the Node bridge can consume scrcpy video and control without
unacceptable latency or CPU overhead, and that Dockerode can manage the runtime container.

## R13 — State and configuration

**Decision**: Store pairing credentials and sessions in SQLite (`data/state/nexphone.db`). Store
configuration in a YAML file validated by Zod, with environment variable overrides limited to
secrets and deployment paths.

**Rationale**: SQLite gives atomic updates, simple revocation queries and crash safety without a
server. YAML is readable for self-hosters and easy to document.

**Alternatives considered**: in-memory state (lost on restart, sessions would not survive gateway
restarts), JSON files (manual atomic writes and locking), PostgreSQL (unnecessary service).

**Validation needed**: migration on first start, session survives gateway restart, revoke is
durable, and the database is created with restrictive permissions.

## R14 — Testing strategy

**Decision**: Vitest for unit tests and the adapter contract suite; Playwright for browser flows;
an `@integration` suite that runs against real Redroid on a KVM-capable host. Default CI runs unit,
contract and fake-adapter end-to-end tests; the real-runtime suite is documented for local/self-
hosted runners.

**Rationale**: Hosted CI commonly lacks binder modules and KVM, as documented by Redroid's own
issues. Making the real-runtime suite explicitly optional keeps CI green without pretending the
runtime is tested. The contract suite is the mechanism that proves adapter replaceability.

**Alternatives considered**: requiring KVM in hosted CI (unreliable), mocking the runtime entirely
(does not validate the real integration), skipping integration tests (violates the constitution's
testing expectations).

**Validation needed**: confirm the fake adapter passes the same contract suite as Redroid, and that
the integration suite fails clearly when KVM or binder is missing.

## R15 — Known limitations to document

- Applications that require Google Play Services, Play Integrity or hardware-backed attestation may
  install but not function.
- Biometrics, secure element, NFC, cellular radio, GPS and camera hardware are absent or simulated.
- ARM-only applications depend on native-bridge support and may fail without it.
- DRM-protected video may refuse to play on a virtual device.
- Software rendering limits frame rate and increases CPU use.
- Single-session and single-runtime limits are intentional for M0.
- The web client is not a hardened kiosk; the phone's browser and OS remain part of the trust
  boundary.

## Phase 0 exit criteria (hard gates)

Implementation MUST NOT begin until all of the following are demonstrated and recorded in an ADR:

1. **Isolation**: Android boots and runs an app without Docker `--privileged`, with a documented
   minimal capability/device/mount set, or Redroid is rejected.
2. **Kernel**: binder works on the reference Ubuntu 24.04 host and `memfd` replaces `ashmem`.
3. **Runtime**: boot completes, a sample APK installs and launches, and `/data` survives a restart.
4. **Streaming**: H.264 video reaches a phone browser and input events reach the app, with measured
   p50/p95 latency.
5. **Persistence**: data survives both runtime restart and host reboot; storage failure is safe.
6. **Security**: pairing, expiry, rate limiting, revocation, TLS trust and log redaction are
   demonstrated.
7. **Baseline**: the reference hardware and measured latency become the documented M0 threshold.

## Source notes

- Redroid documentation and image parameters: `github.com/remote-android/redroid-doc`,
  Docker Hub `redroid/redroid`.
- Kernel binder/ashmem/memfd behavior: Redroid documentation and Ubuntu 24.04 reports.
- scrcpy WebCodecs streaming: Tango ADB documentation (`tangoadb.dev`) and the `@yume-chan`
  packages.
- WebCodecs H.264 support: WebCodecs specification and browser support documentation.
- GPU modes and limitations: Redroid image documentation and issue tracker.
