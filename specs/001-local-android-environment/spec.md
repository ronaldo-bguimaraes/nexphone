# Feature Specification: NexPhone M0 — Local Virtual Android Environment

**Feature Branch**: `001-local-android-environment`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Define the first functional milestone of NexPhone: a persistent
Android environment hosted on a Linux computer and accessible remotely from a physical Android phone
over a local network."

> **Scope note**: This specification covers M0 only. The long-term reference architecture — Agent,
> UI Engine, Device Bridge, adaptive interaction modes and additional execution environments — is
> documented in [`docs/architecture.md`](../../docs/architecture.md) and is out of scope here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy and start the environment (Priority: P1)

A developer or self-hoster installs NexPhone on a supported Ubuntu computer, starts the services,
and sees the Android environment reach a ready state.

**Why this priority**: Nothing else in the milestone can be demonstrated or tested until the host
deployment and runtime lifecycle work. This is the foundation of the local-first promise.

**Independent Test**: On a freshly provisioned Ubuntu 24.04 host, follow only the published
deployment instructions, start NexPhone, and confirm the status report shows the Android runtime as
ready. No prior knowledge of the codebase is assumed.

**Acceptance Scenarios**:

1. **Given** a fresh supported host with virtualization enabled, **When** the operator follows the
   documented installation and starts the services, **Then** the runtime reaches a ready state and
   the status report shows it as healthy.
2. **Given** a host that does not meet a documented prerequisite (for example, hardware
   virtualization is unavailable), **When** installation or startup runs, **Then** it stops before
   launching the runtime and reports which prerequisite failed and how to resolve it.
3. **Given** a running environment, **When** the operator stops the services, **Then** the runtime
   shuts down cleanly and the status report shows it as stopped.

---

### User Story 2 - Install and run an application (Priority: P1)

An operator installs an Android application package into the environment, launches it directly, and
stops it when finished. No conventional launcher or home screen is used.

**Why this priority**: Running applications is the purpose of the Android environment. Without this,
the milestone cannot demonstrate application-centric operation.

**Independent Test**: Starting from a ready environment, install a representative application
package, launch it by identifier, observe it running in the foreground, then stop it and confirm it
is no longer running.

**Acceptance Scenarios**:

1. **Given** a ready environment, **When** the operator installs a valid application package,
   **Then** the application is listed as installed with its identifier and version.
2. **Given** an installed application, **When** the operator launches it directly, **Then** the
   application becomes the visible foreground application without requiring a launcher.
3. **Given** a running application, **When** the operator stops it, **Then** the application process
   is no longer running and the environment remains healthy.
4. **Given** an invalid or incompatible package, **When** installation is attempted, **Then** the
   failure is reported with a category indicating the cause and the environment remains healthy.

---

### User Story 3 - Connect from a phone and interact (Priority: P1)

A user opens the NexPhone client on a physical Android phone on the same local network, pairs with
the host, sees the remote Android screen, and interacts with the running application using touch
and keyboard input.

**Why this priority**: Remote interaction from a cheap physical device is the core user value of
the milestone and the proof that the client boundary works.

**Independent Test**: With the environment ready and an application running, open the client on a
phone connected to the same LAN, complete pairing, and verify that the visible screen matches the
host environment and that taps, gestures and typed text are reflected in the running application.

**Acceptance Scenarios**:

1. **Given** a running environment and a phone on the same LAN, **When** the user opens the client
   and completes pairing, **Then** the remote screen becomes visible within the session.
2. **Given** a paired session, **When** the user taps, swipes or types, **Then** the corresponding
   interaction is applied to the foreground application.
3. **Given** a paired session, **When** the network drops and returns, **Then** the client shows the
   disconnection, reconnects within its retry policy, and resumes interaction without restarting
   the environment.
4. **Given** no valid pairing or session, **When** a client attempts to view or control the screen,
   **Then** access is refused and no screen content or input channel is exposed.

---

### User Story 4 - Keep application data across restarts (Priority: P2)

An operator uses an application, restarts the Android runtime or the whole host, and finds the
application's data still present afterwards.

**Why this priority**: Persistence separates a usable personal environment from a disposable
emulator. It validates the storage contract before more complex features are built on it.

**Independent Test**: Create data in an application, restart the runtime, relaunch the application,
and confirm the data is present. Repeat after a host reboot.

**Acceptance Scenarios**:

1. **Given** an application with saved data, **When** the runtime is stopped and started again,
   **Then** the data is present after relaunch.
2. **Given** an application with saved data, **When** the host is rebooted normally, **Then** the
   data is present after services start and the application is relaunched.
3. **Given** that the persistent storage location is missing or not writable, **When** startup runs,
   **Then** the environment fails safely without overwriting or discarding existing data and reports
   the storage problem.

---

### User Story 5 - Understand and recover from failures (Priority: P2)

A developer or user encounters a failure in the runtime, storage or remote connection and can tell
what failed, where to look, and what to try next.

**Why this priority**: A self-hosted system is only maintainable if failures are legible. This story
makes the milestone debuggable without reading source code.

**Independent Test**: Inject a runtime crash, an invalid pairing attempt and a storage permission
problem, and verify that each produces a distinct, actionable message and a relevant log entry.

**Acceptance Scenarios**:

1. **Given** a running environment, **When** the runtime crashes, **Then** status changes to failed
   or restarting, the event is logged with a cause where available, and the user is informed.
2. **Given** an authentication attempt with an invalid or expired pairing code, **When** it is
   submitted, **Then** it is refused with a non-revealing message and logged without the secret.
3. **Given** a failure, **When** the operator consults the status report and logs, **Then** they can
   identify the failing component and the documented remediation step.

---

### User Story 6 - Replace the runtime implementation (Priority: P3)

A developer implements an alternative Android runtime adapter and runs the platform against it
without changing the client or unrelated backend code.

**Why this priority**: Runtime replaceability is a constitutional requirement and a key
architectural risk. Proving it in M0 prevents Redroid-specific assumptions from becoming permanent.

**Independent Test**: A mock or secondary adapter passes the documented runtime contract suite and
the platform operates against it with only configuration changes outside the adapter.

**Acceptance Scenarios**:

1. **Given** the documented runtime contract and contract suite, **When** a new adapter is
   implemented, **Then** it can be selected by configuration and satisfies the suite.
2. **Given** the platform running with an alternative adapter, **When** the client connects and the
   lifecycle is exercised, **Then** no changes are required outside the adapter and its
   configuration.
3. **Given** a codebase review, **When** runtime-specific identifiers or behaviors are searched
   outside the adapter boundary, **Then** none are found in the client, gateway or shared domain
   logic.

---

### Edge Cases

- Hardware virtualization is disabled in firmware, unavailable in a virtual machine, or `/dev/kvm`
  is not accessible to the service user.
- The host has insufficient memory or disk for the documented baseline, or the disk fills during
  application use.
- A required network port is already in use, or the host has multiple network interfaces and the
  wrong one is selected.
- The runtime fails to start, exits during boot, or crashes while an application is running.
- An application package targets an unsupported architecture or Android version, is corrupt, or
  requires unavailable hardware or Google services.
- The persistent storage volume is missing, read-only, owned by the wrong user, or was left in an
  inconsistent state by an unclean shutdown.
- The phone changes networks, loses Wi-Fi, sleeps, backgrounds the browser, or receives a new IP
  address during a session.
- A second client attempts to connect while a session is active.
- An attacker on the LAN repeatedly guesses pairing codes or replays an expired token.
- The host clock jumps, invalidating session or certificate validity assumptions.
- The browser rejects the host's TLS certificate, or the user connects over plain HTTP by mistake.
- The remote screen stalls or degrades while input continues to be delivered.
- An application requests permissions or device capabilities that the virtual environment cannot
  provide.
- The operator tries to run two environment instances against the same storage simultaneously.

## Requirements *(mandatory)*

### Functional Requirements

**Local deployment**

- **FR-001**: The system MUST be deployable on the documented baseline host: Ubuntu 24.04 LTS,
  x86_64, with hardware virtualization enabled, without cloud infrastructure, paid services or an
  external account.
- **FR-002**: Deployment documentation MUST state required hardware, operating system, kernel
  features, packages, permissions, ports and configuration values.
- **FR-003**: The operator MUST be able to start and stop all NexPhone services through a single
  documented procedure.
- **FR-004**: Installation and startup MUST validate prerequisites before launching the runtime and
  MUST report each unmet prerequisite with an actionable remediation hint.
- **FR-005**: Deployment MUST be repeatable and idempotent, and MUST use explicitly pinned artifact
  versions so that two deployments from the same inputs produce the same result.
- **FR-006**: After initial setup, normal local operation MUST NOT require internet access, an
  external LLM, a cloud account or a third-party API.

**Android runtime**

- **FR-007**: The system MUST start and stop an Android environment programmatically through a
  documented control interface.
- **FR-008**: The system MUST detect runtime readiness with a bounded wait and MUST report a timeout
  failure rather than hanging indefinitely.
- **FR-009**: The system MUST report runtime health as one of: stopped, starting, ready, degraded or
  failed.
- **FR-010**: The system MUST detect an unexpected runtime exit, log it, and apply a documented
  restart policy bounded by a maximum attempt count.
- **FR-011**: The runtime adapter MUST expose discovered capabilities, including Android version,
  supported CPU architectures, display characteristics and availability of optional features.
- **FR-012**: Applications MUST be launchable directly without a conventional launcher or home
  screen, while retaining the Android framework services required for application compatibility.
- **FR-013**: The system MUST NOT assume that every Android application is compatible; unsupported
  capabilities MUST be reported rather than silently failing.

**Application management**

- **FR-014**: The operator MUST be able to install an application from a local package artifact.
- **FR-015**: The operator MUST be able to list installed applications with identifier, version and
  running state.
- **FR-016**: The operator MUST be able to launch an installed application by identifier and bring
  it to the foreground.
- **FR-017**: The operator MUST be able to stop a running application without stopping the runtime.
- **FR-018**: Installation and launch failures MUST be reported with a cause category (for example:
  incompatible, corrupt, not installed, already running) and without compromising environment
  health.
- **FR-019**: Application data MUST persist across runtime restarts.
- **FR-020**: Application data and environment configuration MUST persist across service restarts
  and normal host reboots.
- **FR-021**: The persistent storage location, ownership and backup expectations MUST be documented,
  and startup MUST fail safely if the location is missing or not writable.

**Remote interaction**

- **FR-022**: A physical Android phone on the same local network MUST be able to connect to the host
  using a mobile web client in its browser, without installing an application from a store.
- **FR-023**: Access MUST require pairing: the host displays a short-lived pairing code, and a
  successful exchange creates a session credential.
- **FR-024**: Pairing codes MUST expire after a documented period and MUST be rate-limited against
  repeated guessing.
- **FR-025**: An authenticated session MUST display a live view of the remote Android screen.
- **FR-026**: The client MUST forward touch, tap, long-press, swipe and scroll interactions to the
  remote environment.
- **FR-027**: The client MUST forward keyboard and text input to the focused remote application.
- **FR-028**: The client MUST show connection state (connecting, connected, reconnecting,
  disconnected) and the reason for a terminal failure.
- **FR-029**: The client MUST attempt bounded automatic reconnection after a transient network loss
  and resume the session without restarting the runtime.
- **FR-030**: Unauthenticated, expired or revoked clients MUST be denied screen content and input
  forwarding.
- **FR-031**: The operator MUST be able to revoke active session credentials.
- **FR-032**: M0 MUST support exactly one active interactive session; a second connection attempt
  MUST be refused with an explanatory message and MUST NOT silently take over the session.
- **FR-033**: Remote access MUST bind to the local network by default and MUST NOT be exposed to the
  public internet by default.
- **FR-034**: The client MUST use only the documented remote-interaction contract and MUST NOT
  depend on Android runtime internals.

**Runtime abstraction**

- **FR-035**: A documented runtime adapter contract MUST cover lifecycle, readiness and health,
  capability discovery, application management, persistent storage attachment, screen capture and
  input injection.
- **FR-036**: The adapter contract MUST be versioned, and incompatible contract changes MUST be
  detectable.
- **FR-037**: The active runtime adapter MUST be selectable through configuration.
- **FR-038**: Runtime-specific identifiers, paths, commands and behaviors MUST NOT appear outside
  the adapter boundary in the client, remote gateway or shared domain logic.
- **FR-039**: An executable contract suite MUST be provided that any adapter can run to demonstrate
  compliance.
- **FR-040**: It MUST be possible to add a second adapter, including a test double, and operate the
  platform with it through configuration alone.

**Observability**

- **FR-041**: The system MUST expose a status view containing runtime state and health, adapter and
  contract version, environment version, persistent storage status and active session count.
- **FR-042**: The system MUST emit logs for deployment, startup, shutdown, crashes, application
  operations, connection attempts, authentication results and session termination.
- **FR-043**: User-facing errors MUST state what failed, which component was involved, and a
  remediation step, without requiring source-code inspection.
- **FR-044**: Logs MUST redact session credentials, pairing codes, certificate material and screen
  content.
- **FR-045**: Log verbosity and retention MUST be configurable, and defaults MUST avoid retaining
  unnecessary sensitive information.

**Security and privacy**

- **FR-046**: Authentication and authorization MUST be enforced by the remote-access layer,
  independently of any AI behavior or model output.
- **FR-047**: Session credentials and pairing secrets MUST NOT be stored in plaintext and MUST NOT
  appear in logs, status output or client-visible errors.
- **FR-048**: Session transport MUST be encrypted; an unverified certificate MUST require explicit
  user trust and MUST NOT be silently accepted.
- **FR-049**: The Android environment MUST NOT receive unrestricted host privileges, host control
  sockets or broader mounts than documented.
- **FR-050**: Persistent storage and configuration MUST be mounted with least privilege and clear
  ownership.
- **FR-051**: Authentication endpoints MUST be rate-limited and MUST log failures without revealing
  whether a code or session existed.
- **FR-052**: The system MUST NOT enable telemetry, analytics or cloud synchronization by default.
- **FR-053**: Screen and input data MUST NOT be recorded or persisted beyond the active session.
- **FR-054**: Runtime images, packages and deployment artifacts MUST be pinned and verified against
  checksums, and their licenses MUST be compatible with the project's open-source licensing.

### Non-Functional Requirements

- **NFR-001 Reliability**: A runtime crash MUST be detected within one documented health-check
  interval, reported, and recovered according to the restart policy without operator intervention.
- **NFR-002 Durability**: Normal restarts MUST NOT lose application data. Unclean shutdown MUST NOT
  silently corrupt data; the system MUST detect and report an inconsistent state on the next start.
- **NFR-003 Interaction latency**: The system MUST measure and expose end-to-end input-to-display
  latency per session. The target threshold MUST be established from the feasibility prototype and
  recorded before planning concludes; it MUST NOT be invented in advance.
- **NFR-004 Resource use**: Idle and active host resource consumption MUST be measured and
  documented for the reference hardware, and configurable limits MUST prevent a single environment
  from exhausting the host.
- **NFR-005 Security posture**: Defaults MUST be secure: LAN-only binding, authenticated sessions,
  encrypted transport, least-privilege runtime isolation and redacted logs.
- **NFR-006 Maintainability**: Subsystem boundaries MUST be explicit, the adapter contract MUST be
  the only runtime integration point, and components MUST be independently testable.
- **NFR-007 Reproducibility**: Deployment and development environments MUST be reproducible from
  documented, pinned inputs; local network operation MUST NOT depend on external services.
- **NFR-008 Automated testing**: The project MUST provide unit tests, adapter contract tests and an
  integration suite that exercises the real runtime on a KVM-capable host. Integration tests MAY be
  run locally when hosted CI cannot provide virtualization.
- **NFR-009 Observability**: Status and logs MUST be sufficient to distinguish host, storage,
  runtime, authentication and network failures without attaching a debugger.
- **NFR-010 Documentation**: Documentation MUST cover deployment, configuration, start/stop,
  pairing, supported applications and known limitations.
- **NFR-011 Compatibility transparency**: The specification and documentation MUST distinguish
  verified capabilities from assumptions, including Google services, hardware-backed features and
  device-integrity restrictions.
- **NFR-012 Portability**: The abstraction MUST allow a second runtime implementation to be added
  without modifying the client or unrelated backend components.

### Key Entities *(include if feature involves data)*

- **Host Deployment**: The installed NexPhone instance on a Linux host, including configuration,
  service state and version.
- **Runtime Instance**: A single Android environment with an identity, state, health and discovered
  capabilities.
- **Runtime Adapter**: The implementation that translates the documented runtime contract into a
  specific runtime's operations.
- **Application**: An installed Android package with identifier, version, running state and
  associated data.
- **Persistent Environment Store**: The durable storage that holds application data, configuration
  and environment state across restarts.
- **Session**: An authenticated remote interaction between one client and the environment, with
  state, start time and termination reason.
- **Pairing Credential**: A short-lived secret used to establish a session, with expiry and
  revocation state.
- **Health Status**: The current lifecycle and health state of the runtime and related components.
- **Operational Event**: A log record describing deployment, lifecycle, application, authentication
  or connection activity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Three independent testers, each starting from a fresh supported host, deploy NexPhone
  and reach a ready runtime using only the published documentation, with no undocumented steps.
- **SC-002**: Starting the environment produces a visible ready state within the startup budget
  established by the feasibility prototype and recorded in the documentation.
- **SC-003**: In 5 of 5 trials, a representative application can be installed, launched and stopped
  through documented operations on the reference host.
- **SC-004**: In 5 of 5 trials, application data created before a runtime restart is present after
  relaunch; the same holds after a normal host reboot.
- **SC-005**: A phone on the same LAN completes pairing and displays the remote screen within two
  minutes of opening the client.
- **SC-006**: In 5 of 5 scripted trials, taps, swipes and typed text are reflected in the remote
  application, and the client reports its connection state correctly.
- **SC-007**: Runtime crash, invalid pairing and storage-permission failures each produce a
  distinct, actionable message and a corresponding log entry in 100% of injected trials.
- **SC-008**: The adapter boundary is verified by an automated check showing zero runtime-specific
  references outside the adapter, and by operating the platform with a second adapter that passes
  the contract suite.
- **SC-009**: With wide-area connectivity disabled after setup, the deploy-to-interact flow still
  succeeds, demonstrating that no external service is required for normal operation.
- **SC-010**: Every interactive session reports measured input-to-display latency, and the recorded
  values are used to set the M0 acceptance threshold before implementation planning ends.
- **SC-011**: Revoking a session immediately prevents further screen access and input in 5 of 5
  trials.

## Assumptions

- M0 serves a single user, a single runtime instance and a single active session on one host.
- The reference host is Ubuntu 24.04 LTS on x86_64 with hardware virtualization enabled; exact CPU,
  memory and disk minimums are established by the feasibility prototype and then documented.
- The phone runs a current Android version with a modern browser and is on the same IPv4 local
  network as the host, with no NAT traversal or port forwarding required.
- The representative test application is an open-source package that does not require Google Play
  Services, hardware-backed keystores or device-integrity attestation. Compatibility with such
  applications is not guaranteed in M0.
- The AI Engine, voice interaction, persistent memory and autonomous workflows do not exist in this
  milestone and are not required by any M0 flow.
- Internet access may be needed once to fetch pinned artifacts; mirrors can satisfy this. Runtime
  operation afterwards is local.
- Audio streaming, multi-user access, multiple environments, public-internet exposure, native phone
  applications and high-availability deployment are outside M0.
- The host and the local network are trusted enough to run a self-hosted service, but LAN peers are
  not implicitly trusted; authentication and transport encryption remain mandatory.
- The Android runtime implementation is provisional. Redroid is a candidate to evaluate, not an
  assumed dependency.

## Technical Assumptions and Dependencies

The feasibility work below MUST be completed before implementation commitments are made. Status
values: **Verified**, **Assumed**, **Unverified**, **Known limitation**.

| Area | Status | Notes |
| --- | --- | --- |
| Redroid compatibility with Ubuntu 24.04 host kernels | Unverified | Candidate runtime only; must be evaluated against the documented baseline. |
| Required kernel features (binder, namespaces, cgroups, memory management) | Assumed | Expected to be required by container-based Android runtimes; must be confirmed on the baseline kernel. |
| KVM availability and permissions | Assumed | Hardware virtualization must be enabled and accessible to the service user; nested virtualization behavior is unverified. |
| GPU acceleration and graphics path | Unverified | Software rendering may be required as a fallback; performance and compatibility impact unknown. |
| Android version and application compatibility | Unverified | Version selection follows the runtime evaluation; ABI and API-level constraints must be documented. |
| Screen capture and streaming approach | Unverified | Multiple viable approaches exist; selection must follow measured comparison of latency, compatibility and client support. |
| Input injection approach | Unverified | Touch, gestures and keyboard must be demonstrated on the chosen runtime. |
| Persistent storage behavior | Assumed | A durable host-backed volume can preserve application data; failure and corruption behavior must be tested. |
| Google Play Services and Play Integrity | Known limitation | Applications depending on them may install but not function; this must be documented, not worked around with proprietary components. |
| Hardware-backed keystore and biometrics | Known limitation | Virtual environments generally cannot provide them; affected applications may fail. |
| Hosted CI with virtualization | Unverified | KVM may be unavailable in hosted CI; integration tests may need a self-hosted or local runner. |
| Mobile browser streaming support | Assumed | The phone browser can decode the selected stream and send input; actual codec and latency behavior must be validated. |

Primary dependencies:

- A supported Linux kernel with the features required by the chosen runtime.
- A container or process isolation mechanism suitable for the runtime.
- Android platform tooling for package installation and inspection.
- A TLS certificate mechanism for local-network transport.
- A browser on the phone capable of the selected streaming and input transport.
- Pinned Android runtime artifacts whose licenses are compatible with the project.

## Security and Privacy Considerations

**Threat model**

- A malicious or compromised device on the same local network.
- A malicious or untrusted Android application running inside the environment.
- A stolen or replayed pairing code or session credential.
- A compromised or misconfigured client browser.
- Accidental public exposure through host firewall or router configuration.
- Supply-chain tampering of runtime images or application packages.

**Required protections**

- Authentication and authorization live in the remote-access layer, outside any AI component.
- Default binding is the local network only; public exposure requires explicit configuration and
  documentation of the added risk.
- Session transport is encrypted; certificate trust is explicit.
- Pairing codes are short-lived, rate-limited and single-use.
- Session credentials are revocable and protected at rest.
- The Android environment runs with least privilege and cannot reach host control interfaces.
- Logs redact secrets and never contain screen content.
- Screen and input data are transient and are not recorded by default.
- No telemetry or cloud synchronization is enabled by default.
- Runtime images and packages are pinned and checksum-verified.

**Residual risks to document**

- Anyone who can observe the local network may attempt authentication; rate limits and encryption
  reduce but do not eliminate this.
- Applications that depend on Google services, hardware-backed security or integrity attestation may
  not work.
- A user who deliberately exposes the service to the internet accepts risks beyond the M0 defaults.
- Browser and operating-system vulnerabilities on the phone are outside the project's control.

## Out of Scope

- The AI Engine, natural-language interaction, voice input, persistent AI memory, autonomous
  workflows and AI-generated interfaces.
- A native Android client application; M0 uses a mobile web client. The contract must remain
  suitable for a future native client.
- Multiple Android environments, multi-user support, role management and tenant isolation.
- Public-internet access, NAT traversal, relay services and remote access outside the LAN.
- Kubernetes, clustered deployment, high availability and horizontal scaling.
- Audio streaming and audio input.
- Google Play Store access and guaranteed Google Play Services support.
- A custom Android distribution built from scratch.
- Application-specific integrations and automation APIs.
- Backup, restore and migration tooling beyond documenting storage expectations.
- Performance service-level agreements beyond the measured M0 baseline.
- iOS, desktop or web-dashboard clients.
- Automated updates and release channels.

## Open Questions

1. Which Android version and ABI target should the reference runtime use, based on the feasibility
   evaluation?
2. Which screen-streaming and input-transport approach best meets measured latency, browser support
   and runtime compatibility?
3. What are the exact minimum CPU, memory, disk and GPU requirements for the reference host?
4. What input-to-display latency threshold should become the M0 acceptance target, based on
   prototype measurements?
5. Should the environment start automatically at host boot, or only on explicit operator action?
6. How should a second connection attempt behave when the single-session limit is reached: refuse,
   or offer an explicit operator-approved takeover in a later milestone?
7. Which local certificate provisioning approach gives acceptable browser trust UX without
   weakening verification?
8. Which phone browsers and minimum Android versions are officially supported for the web client?
9. Should M0 expose application installation and lifecycle operations through a command-line
   interface, a local HTTP interface, or both, given that the client must remain independent of
   runtime internals?
