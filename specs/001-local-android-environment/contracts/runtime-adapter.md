# Runtime Adapter Contract — v1.0

**Status**: Draft for M0
**Contract version**: `1.0.0`
**Applies to**: `backend/src/runtime/contract.ts`

This contract is the only permitted boundary between the NexPhone gateway and an Android runtime.
The gateway, the web client and shared domain logic MUST NOT reference runtime-specific identifiers,
paths, commands, images or properties. Those belong exclusively to an adapter implementation.

The contract is language-neutral in intent but is realized as a TypeScript interface for M0. A
future adapter may run in-process or behind a process boundary as long as it satisfies the semantics
below.

## Compatibility

- The contract uses semantic versioning.
- The gateway declares a supported range (M0: `^1.0.0`).
- Adding an optional method or optional field is MINOR.
- Changing or removing required semantics is MAJOR and requires an ADR.
- An adapter reports its `contractVersion`; an incompatible adapter MUST be refused at startup with
  a clear error.

## Required members

```ts
export interface RuntimeAdapter {
  readonly id: string;                 // stable, lowercase, e.g. "redroid"
  readonly contractVersion: string;    // semver, e.g. "1.0.0"

  validateHost(): Promise<HostCheckResult>;
  start(options: StartOptions): Promise<void>;
  stop(options?: StopOptions): Promise<void>;
  getStatus(): Promise<RuntimeStatus>;
  waitForReady(timeoutMs: number): Promise<RuntimeStatus>;
  getCapabilities(): Promise<RuntimeCapabilities>;
  getStorageStatus(): Promise<StorageStatus>;

  listApps(): Promise<ApplicationInfo[]>;
  installApp(options: InstallOptions): Promise<ApplicationInfo>;
  launchApp(packageId: string): Promise<void>;
  stopApp(packageId: string): Promise<void>;

  openTransport(): Promise<RuntimeTransport>;

  onStateChange(listener: (status: RuntimeStatus) => void): () => void;
}
```

### `validateHost()`

Checks host prerequisites without mutating state. MUST return one entry per unmet prerequisite with
a stable `code`, a human-readable `message` and a `remediation` string. MUST NOT throw for expected
prerequisite failures.

### `start(options)`

Starts the runtime. MUST be idempotent: starting an already-ready runtime resolves successfully.
MUST NOT return until the start operation has been accepted, not necessarily until ready. Readiness
is observed through `waitForReady()` or `getStatus()`.

### `stop(options)`

Stops the runtime gracefully within `timeoutMs`, then forcibly if required. MUST preserve the
persistent data store. MUST be idempotent.

### `waitForReady(timeoutMs)`

Polls or subscribes until the runtime is `ready`, then resolves with the final status. MUST reject
with `READY_TIMEOUT` when the budget is exhausted. MUST NOT hang indefinitely.

### `getStatus()`

Returns the current lifecycle and health without side effects. MUST be safe to call frequently.

### `getCapabilities()`

Returns discovered capabilities after the runtime is ready. Values describe the runtime, not the
host.

### `getStorageStatus()`

Reports whether the persistent store is `ok`, `missing`, `read-only`, `unsafe` or `inconsistent`,
with a remediation hint. The gateway refuses to start the runtime unless this is `ok` or safely
initializable.

### Application operations

- `installApp({ artifactPath })` installs a local package. Must reject with a normalized cause
  category and must not leave a partial installation marked as installed.
- `listApps()` returns installed packages with identifier, label, version and run state.
- `launchApp(packageId)` brings the app to the foreground without requiring a launcher.
- `stopApp(packageId)` stops the app process without stopping the runtime.

### `openTransport()`

Opens the video and input channels for one interactive session. The gateway may keep this open until
the session ends. Only one transport may be active at a time for M0; a second call MUST reject with
`SESSION_BUSY`.

```ts
export interface RuntimeTransport {
  readonly video: AsyncIterable<VideoPacket>;
  readonly input: InputSink;
  close(): Promise<void>;
}

export interface VideoPacket {
  data: Uint8Array;          // Annex B H.264 access unit
  keyframe: boolean;
  timestampUs: number;
  width: number;
  height: number;
}

export interface InputSink {
  tap(x: number, y: number): Promise<void>;
  swipe(x1: number, y1: number, x2: number, y2: number, durationMs: number): Promise<void>;
  scroll(x: number, y: number, deltaX: number, deltaY: number): Promise<void>;
  key(keyCode: number, action: "down" | "up"): Promise<void>;
  text(value: string): Promise<void>;
  close(): Promise<void>;
}
```

Coordinates are in the runtime's current display coordinate space. Out-of-bounds input MUST be
rejected with `INPUT_REJECTED`, never clamped.

### `onStateChange(listener)`

Registers a listener for lifecycle changes. Returns an unsubscribe function. The adapter MUST emit
on every transition listed in the data model and MUST NOT emit duplicate states.

## Data shapes

```ts
export type RuntimeState =
  | "stopped" | "starting" | "ready" | "stopping" | "restarting" | "failed";

export type Health = "ok" | "degraded" | "unhealthy";

export interface RuntimeStatus {
  state: RuntimeState;
  health: Health;
  startedAt: string | null;   // ISO 8601 UTC
  lastError: NormalizedError | null;
  restartAttempts: number;
}

export interface RuntimeCapabilities {
  androidVersion: string;
  apiLevel: number;
  abiList: string[];
  displayWidth: number;
  displayHeight: number;
  fps: number;
  gpuMode: "guest" | "host";
  features: Record<string, boolean>;
}

export interface ApplicationInfo {
  packageId: string;
  label: string;
  versionName: string;
  versionCode: number;
  state: "installed" | "starting" | "running" | "stopped" | "error";
  installedAt: string;
  lastLaunchedAt: string | null;
}

export interface NormalizedError {
  code: AdapterErrorCode;
  message: string;
  remediation: string;
  cause?: string;             // redacted technical detail
}

export type AdapterErrorCode =
  | "PREREQUISITE_MISSING"
  | "START_FAILED"
  | "READY_TIMEOUT"
  | "CRASHED"
  | "APP_NOT_FOUND"
  | "APP_INCOMPATIBLE"
  | "APP_CORRUPT"
  | "APP_LAUNCH_FAILED"
  | "STORAGE_UNAVAILABLE"
  | "STREAM_FAILED"
  | "INPUT_REJECTED"
  | "SESSION_BUSY"
  | "NOT_SUPPORTED"
  | "INTERNAL";
```

## Isolation requirements

An adapter MUST NOT:

- Start the runtime with Docker `--privileged`.
- Mount the host Docker socket, host root filesystem or host home directory.
- Share the host PID or network namespace.
- Grant broader Linux capabilities than the documented minimum for that adapter.

An adapter MUST:

- Mount only the configured data store and explicitly required devices.
- Document its minimum capability and device set in an ADR.
- Fail closed with `PREREQUISITE_MISSING` when the required isolation cannot be established.

## Configuration

Adapter-specific configuration is an opaque map validated by the adapter:

```ts
export interface StartOptions {
  image: string;              // pinned digest
  display: { width: number; height: number; fps: number };
  gpuMode: "guest" | "host" | "auto";
  memoryLimitMb?: number;
  dataPath: string;
  adapterConfig: Record<string, unknown>;
}
```

The gateway validates the common fields. The adapter validates its own map and rejects unknown keys.

## Conformance suite

Every adapter MUST pass `backend/tests/contract/runtime-adapter.spec.ts`, which covers:

1. Host validation returns structured results and does not throw for missing prerequisites.
2. Start/stop are idempotent and emit exactly one transition per state change.
3. Readiness resolves or fails within the timeout budget.
4. Status and capabilities are stable while ready.
5. Install, launch, list and stop behave and report normalized errors.
6. Storage status is reported and blocks startup when unsafe.
7. Transport delivers ordered video packets and accepts every input type.
8. Out-of-bounds input is rejected.
9. A second transport request is rejected with `SESSION_BUSY`.
10. Isolation checks confirm no privileged flags or forbidden mounts are used.

The fake adapter used by unit and browser tests MUST use the same suite.

## Error mapping

Adapters map implementation-specific failures to `AdapterErrorCode`. Raw stderr, command lines and
runtime-specific identifiers MUST NOT cross the boundary; they may appear only in redacted
`cause` text when safe. User-facing remediation is provided by the gateway, not by the adapter.
