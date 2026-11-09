# Phase 1 Data Model — NexPhone M0

**Feature**: `001-local-android-environment`
**Date**: 2026-11-09

This model describes the domain entities required by the specification. It is implementation-aware
only where the plan has already chosen a mechanism (SQLite for control state, a host directory for
Android data). Field types are logical, not a database schema.

## Entity overview

| Entity | Purpose | Lifetime |
| --- | --- | --- |
| DeploymentConfig | Operator-provided settings for the host installation | Persistent file |
| RuntimeInstance | The single Android environment and its lifecycle state | One per deployment |
| RuntimeCapabilities | Discovered abilities of the active runtime | Recomputed on start |
| PersistentStore | The durable Android data location and its health | One per deployment |
| Application | An installed Android package and its run state | Persistent, except uninstall |
| PairingCredential | Short-lived secret used to create a session | Minutes |
| Session | An authenticated remote interaction | Hours, revocable |
| OperationalEvent | Structured log record for diagnosis | Configurable retention |
| InputEvent | A transient user interaction forwarded to Android | Milliseconds |

## DeploymentConfig

Operator-owned configuration, loaded from YAML with environment overrides for secrets and paths.

| Field | Type | Required | Validation | Notes |
| --- | --- | --- | --- | --- |
| `host.binding` | enum `lan` \| `loopback` | Yes | Default `lan` | Public binding is not offered in M0. |
| `host.port` | integer | Yes | 1–65535, default 8443 | Served through TLS. |
| `host.tls.mode` | enum `caddy-internal` \| `provided` | Yes | Default `caddy-internal` | `provided` requires cert and key paths. |
| `runtime.adapter` | string | Yes | Registered adapter ID | `redroid` is the only M0 implementation. |
| `runtime.image` | string | Yes | Pinned digest | Reject floating tags. |
| `runtime.display.width` | integer | Yes | 320–1920, multiple of 2 | Default 720. |
| `runtime.display.height` | integer | Yes | 320–1920, multiple of 2 | Default 1280. |
| `runtime.display.fps` | integer | Yes | 1–60, default 30 | Subject to measured capability. |
| `runtime.gpuMode` | enum `guest` \| `host` \| `auto` | Yes | Default `guest` | `host` requires a render device. |
| `runtime.memoryLimitMb` | integer | No | 1024–65536 | Applied where the runtime supports it. |
| `storage.dataPath` | absolute path | Yes | Exists or creatable, writable | Must not be the host root. |
| `storage.statePath` | absolute path | Yes | Writable directory | Holds the SQLite database. |
| `auth.pairingTtlSeconds` | integer | Yes | 60–900, default 300 | Pairing code lifetime. |
| `auth.sessionIdleTtlSeconds` | integer | Yes | 300–86400, default 43200 | Idle timeout. |
| `auth.sessionAbsoluteTtlSeconds` | integer | Yes | 3600–172800, default 86400 | Hard expiry. |
| `logging.level` | enum | Yes | `debug` \| `info` \| `warn` \| `error` | Default `info`. |
| `logging.retentionDays` | integer | Yes | 1–90, default 14 | Applied to rotated logs. |

Validation rules:

- Unknown keys are rejected (strict schema).
- `storage.dataPath` and `storage.statePath` must not overlap the repository source tree in
  production.
- `runtime.gpuMode=host` requires a detected render node at startup; otherwise startup fails with a
  remediation message rather than silently falling back.
- Secrets are read from environment variables, never stored in YAML.

## RuntimeInstance

Singleton for M0.

| Field | Type | Validation | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Generated on first start | Stable for the deployment. |
| `adapterId` | string | Must match a registered adapter | `redroid` in M0. |
| `adapterContractVersion` | semver | Must satisfy the gateway's supported range | Detects incompatible adapters. |
| `state` | enum | See state machine | Default `stopped`. |
| `health` | enum `ok` \| `degraded` \| `unhealthy` | Derived | Separate from lifecycle. |
| `androidVersion` | string | From capabilities | Example `14`. |
| `imageDigest` | string | Pinned `sha256:...` | Displayed in status. |
| `startedAt` | timestamp | Nullable | Set on transition to `ready`. |
| `lastError` | object | Nullable | `{code, message, remediation}`. |
| `restartAttempts` | integer | 0–configured maximum | Reset after a stable period. |

### Runtime state machine

```text
stopped ──start──▶ starting ──ready──▶ ready
   ▲                  │                 │
   │                  │ failure         │ crash / stop
   │                  ▼                 ▼
   └──stop──── stopping ◀──stop── ready/restarting
                    │                 │
                    ▼                 │
                  stopped        restarting ──success──▶ starting
                                      │
                                      └──exhausted──▶ failed
```

Allowed transitions:

| From | To | Trigger |
| --- | --- | --- |
| `stopped` | `starting` | Operator start |
| `starting` | `ready` | Readiness probe succeeds |
| `starting` | `failed` | Probe timeout or boot error |
| `ready` | `stopping` | Operator stop |
| `ready` | `restarting` | Unexpected exit |
| `ready` | `failed` | Repeated crash beyond policy |
| `stopping` | `stopped` | Container exit confirmed |
| `restarting` | `starting` | Restart attempt |
| `restarting` | `failed` | Attempt budget exhausted |

The maximum restart attempts and the stable-period reset are configuration values established
during the spike, not invented here.

## RuntimeCapabilities

Computed at runtime start; never operator-edited.

| Field | Type | Notes |
| --- | --- | --- |
| `androidVersion` | string | Release version. |
| `apiLevel` | integer | API level. |
| `abiList` | string[] | Includes native-bridge ABIs if present. |
| `displayWidth` / `displayHeight` | integer | Negotiated stream dimensions. |
| `fps` | integer | Effective capture rate. |
| `gpuMode` | string | `guest` or `host`. |
| `features` | map<string, boolean> | Optional capabilities such as multi-touch, rotation, clipboard. |

Capabilities drive the client UI: unsupported inputs are hidden or disabled rather than failing
silently.

## PersistentStore

| Field | Type | Validation | Notes |
| --- | --- | --- | --- |
| `path` | absolute path | Exists, writable, not a symlink escaping the allowed root | Host bind mount for `/data`. |
| `state` | enum `ok` \| `missing` \| `read-only` \| `unsafe` \| `inconsistent` | Checked at startup | Blocks runtime start unless `ok`. |
| `lastCheckedAt` | timestamp | Set on each check | |
| `sizeBytes` | integer | Reported when available | Informational. |
| `lastSafeStopAt` | timestamp | Nullable | Used to detect unclean shutdown. |

Rules:

- A missing or empty configured path MAY be initialized only when it is explicitly empty.
- A non-empty path that fails inspection MUST NOT be deleted, reinitialized or overwritten.
- If an interrupted write is suspected, the runtime starts in a read-only diagnostic mode and
  reports `inconsistent`; the operator decides how to recover.

## Application

| Field | Type | Validation | Notes |
| --- | --- | --- | --- |
| `packageId` | string | Android package format | Primary identifier. |
| `label` | string | 1–200 chars | Display name. |
| `versionName` | string | From package metadata | |
| `versionCode` | integer | From package metadata | |
| `state` | enum `installed` \| `starting` \| `running` \| `stopped` \| `error` | See state machine | |
| `installedAt` | timestamp | Set on install | |
| `lastLaunchedAt` | timestamp | Nullable | |
| `lastError` | object | Nullable | Cause category plus remediation. |

### Application state machine

```text
(absent) ─install─▶ installed ─launch─▶ starting ─foreground─▶ running
                       ▲                    │                     │
                       │                    │ failure             │ stop
                       │                    ▼                     ▼
                       └───── uninstall ─ error ◀─────── stop ─ stopped
```

Cause categories for failures: `incompatible`, `corrupt`, `not_installed`, `already_running`,
`unsupported_capability`, `runtime_unavailable`, `unknown`. The client shows the category and a
remediation hint, never a raw runtime command.

## PairingCredential

| Field | Type | Validation | Notes |
| --- | --- | --- | --- |
| `id` | UUID | Generated | |
| `codeHash` | string | SHA-256 of the code plus server pepper | Plaintext code never stored. |
| `createdAt` | timestamp | | |
| `expiresAt` | timestamp | `createdAt + pairingTtlSeconds` | |
| `consumedAt` | timestamp | Nullable | Single use. |
| `attempts` | integer | 0–max | Per credential and per source. |
| `sourceIp` | string | Normalized | Used for rate limiting. |

Rules: codes are 8 digits, single-use, expire after the configured TTL, and are rate-limited per
source. A failed attempt does not reveal whether a code exists.

## Session

| Field | Type | Validation | Notes |
| --- | --- | --- | --- |
| `id` | UUID | | |
| `tokenHash` | string | SHA-256 of a 256-bit token | Token shown once to the client. |
| `createdAt` | timestamp | | |
| `lastSeenAt` | timestamp | Updated on activity | Drives idle expiry. |
| `expiresAt` | timestamp | `createdAt + absolute TTL` | |
| `revokedAt` | timestamp | Nullable | Revocation is durable. |
| `clientIp` | string | | |
| `userAgent` | string | Truncated | No secret content. |
| `state` | enum `active` \| `expired` \| `revoked` \| `closed` | Derived | |

Rules: only one session may be `active` at a time. A new pairing while a session is active is
refused with `session_busy`. Revocation takes effect immediately for REST and WebSocket traffic.

## OperationalEvent

| Field | Type | Notes |
| --- | --- | --- |
| `timestamp` | ISO 8601 UTC | |
| `level` | enum | Matches logging configuration. |
| `component` | enum `deploy` \| `gateway` \| `runtime` \| `storage` \| `auth` \| `remote` \| `client` | |
| `event` | string | Stable event name, for example `runtime.start_failed`. |
| `message` | string | Human-readable, redacted. |
| `correlationId` | string | Ties a request or session together. |
| `details` | object | Allow-listed keys only; secrets and screen content excluded. |

Retention follows `logging.retentionDays`. Events are not sent off-host.

## InputEvent

Transient; never persisted.

| Field | Type | Validation |
| --- | --- | --- |
| `type` | enum `tap` \| `swipe` \| `scroll` \| `key` \| `text` | Required |
| `x`, `y` | number | Within negotiated video bounds |
| `x2`, `y2` | number | Required for swipe; within bounds |
| `durationMs` | integer | 0–5000 |
| `keyCode` | integer | Required for key |
| `text` | string | Required for text; max length enforced |
| `pointerId` | integer | Optional, for multi-touch |

Out-of-bounds coordinates are rejected, not clamped, so client and server cannot silently disagree
about the display geometry.

## Relationships

```text
DeploymentConfig 1 ── 1 RuntimeInstance
RuntimeInstance  1 ── 1 PersistentStore
RuntimeInstance  1 ── * Application
RuntimeInstance  1 ── 0..1 Session          (single active session)
PairingCredential 1 ── 0..1 Session
Session          1 ── * OperationalEvent    (by correlationId)
```

## Persistence mapping

| Data | Location | Durability |
| --- | --- | --- |
| Android application data | `data/redroid` (host bind mount) | Survives runtime, gateway and host restarts |
| Pairing credentials and sessions | `data/state/nexphone.db` (SQLite) | Survives gateway restarts; revoked/expired rows retained for audit |
| Configuration | `config/nexphone.yaml` (operator-provided) | Survives restarts |
| Logs | Configured log destination | Rotated by retention policy |
| Video frames and input events | Memory only | Never persisted |

## Data retention and privacy

- Pairing credentials are deleted after expiry plus a short audit window.
- Sessions are retained until expiry or revocation plus the audit window, then deleted.
- Logs never contain tokens, pairing codes, certificate private material or screen content.
- The Android data store is owned by the operator and may be backed up while the runtime is
  stopped; the procedure is documented but automated backup is out of scope for M0.
