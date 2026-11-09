import type {
  ApplicationInfo,
  HostCheckResult,
  InputSink,
  InstallOptions,
  RuntimeAdapter,
  RuntimeCapabilities,
  RuntimeStatus,
  RuntimeTransport,
  StartOptions,
  StopOptions,
  StorageStatus,
  VideoPacket,
} from "../contract.js";
import { RUNTIME_CONTRACT_VERSION } from "../contract.js";
import { AdapterError, type AdapterErrorCode } from "../errors.js";

export interface FakeAdapterOptions {
  id?: string;
  contractVersion?: string;
  startDelayMs?: number;
  failStartWith?: AdapterErrorCode;
  capabilities?: Partial<RuntimeCapabilities>;
  storageStatus?: StorageStatus["state"];
}

/**
 * Deterministic adapter used by unit, contract and browser tests. It performs
 * no external I/O and records every input event it receives.
 */
export class FakeAdapter implements RuntimeAdapter {
  readonly id: string;
  readonly contractVersion: string;
  readonly inputs: string[] = [];
  readonly calls: string[] = [];

  private state: RuntimeStatus["state"] = "stopped";
  private health: RuntimeStatus["health"] = "ok";
  private startedAt: string | null = null;
  private lastError: RuntimeStatus["lastError"] = null;
  private restartAttempts = 0;
  private readonly apps = new Map<string, ApplicationInfo>();
  private readonly listeners = new Set<(status: RuntimeStatus) => void>();
  private transportOpen = false;
  private readonly startDelayMs: number;
  private readonly failStartWith?: AdapterErrorCode;
  private readonly capabilityOverrides: Partial<RuntimeCapabilities>;
  private readonly storageState: StorageStatus["state"];

  constructor(options: FakeAdapterOptions = {}) {
    this.id = options.id ?? "fake";
    this.contractVersion = options.contractVersion ?? RUNTIME_CONTRACT_VERSION;
    this.startDelayMs = options.startDelayMs ?? 0;
    this.failStartWith = options.failStartWith;
    this.capabilityOverrides = options.capabilities ?? {};
    this.storageState = options.storageStatus ?? "ok";
  }

  async validateHost(): Promise<HostCheckResult> {
    return { ok: true, checks: [{ name: "fake", ok: true, message: "Fake host is always ready" }] };
  }

  async start(_options: StartOptions): Promise<void> {
    this.calls.push("start");
    if (this.state === "ready") {
      return;
    }
    this.transition("starting", "ok");
    if (this.startDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.startDelayMs));
    }
    if (this.failStartWith) {
      const error = new AdapterError(this.failStartWith, "The fake runtime failed to start");
      this.lastError = error.toNormalized();
      this.transition("failed", "unhealthy");
      throw error;
    }
    this.startedAt = new Date().toISOString();
    this.transition("ready", "ok");
  }

  async stop(_options?: StopOptions): Promise<void> {
    this.calls.push("stop");
    if (this.state === "stopped") {
      return;
    }
    this.transition("stopping", "degraded");
    this.transition("stopped", "ok");
    this.startedAt = null;
  }

  async getStatus(): Promise<RuntimeStatus> {
    return {
      state: this.state,
      health: this.health,
      startedAt: this.startedAt,
      lastError: this.lastError,
      restartAttempts: this.restartAttempts,
      adapterId: this.id,
      contractVersion: this.contractVersion,
    };
  }

  async waitForReady(timeoutMs: number): Promise<RuntimeStatus> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.state === "ready") {
        return this.getStatus();
      }
      if (this.state === "failed") {
        throw new AdapterError("START_FAILED", "The fake runtime is in a failed state");
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new AdapterError("READY_TIMEOUT", "The fake runtime did not become ready in time");
  }

  async getCapabilities(): Promise<RuntimeCapabilities> {
    return {
      androidVersion: "14",
      apiLevel: 34,
      abiList: ["x86_64"],
      displayWidth: 720,
      displayHeight: 1280,
      fps: 30,
      gpuMode: "guest",
      features: { multiTouch: true, rotation: true },
      ...this.capabilityOverrides,
    };
  }

  async getStorageStatus(): Promise<StorageStatus> {
    return {
      path: "/fake/data",
      state: this.storageState,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async listApps(): Promise<ApplicationInfo[]> {
    return [...this.apps.values()].map((app) => ({ ...app }));
  }

  async installApp(options: InstallOptions): Promise<ApplicationInfo> {
    if (!options.artifactPath.endsWith(".apk")) {
      throw new AdapterError("APP_CORRUPT", "The package is not a valid APK");
    }
    const packageId = "org.example.nexphone.sample";
    const app: ApplicationInfo = {
      packageId,
      label: "Sample",
      versionName: "1.0",
      versionCode: 1,
      state: "installed",
      installedAt: new Date().toISOString(),
      lastLaunchedAt: null,
    };
    this.apps.set(packageId, app);
    return { ...app };
  }

  async launchApp(packageId: string): Promise<void> {
    const app = this.apps.get(packageId);
    if (!app) {
      throw new AdapterError("APP_NOT_FOUND", `Application ${packageId} is not installed`);
    }
    app.state = "running";
    app.lastLaunchedAt = new Date().toISOString();
  }

  async stopApp(packageId: string): Promise<void> {
    const app = this.apps.get(packageId);
    if (!app) {
      throw new AdapterError("APP_NOT_FOUND", `Application ${packageId} is not installed`);
    }
    app.state = "stopped";
  }

  async openTransport(): Promise<RuntimeTransport> {
    if (this.state !== "ready") {
      throw new AdapterError("STREAM_FAILED", "The runtime is not ready");
    }
    if (this.transportOpen) {
      throw new AdapterError("SESSION_BUSY", "A transport is already open");
    }
    this.transportOpen = true;
    const record = (value: string) => this.inputs.push(value);
    const releaseTransport = () => {
      this.transportOpen = false;
    };
    const video: AsyncIterable<VideoPacket> = {
      async *[Symbol.asyncIterator]() {
        // Tests that need frames can subclass and override.
      },
    };
    const input: InputSink = {
      async tap(x, y) {
        record(`tap:${x},${y}`);
      },
      async swipe(x1, y1, x2, y2, durationMs) {
        record(`swipe:${x1},${y1},${x2},${y2},${durationMs}`);
      },
      async scroll(x, y, deltaX, deltaY) {
        record(`scroll:${x},${y},${deltaX},${deltaY}`);
      },
      async key(keyCode, action) {
        record(`key:${keyCode},${action}`);
      },
      async text(value) {
        record(`text:${value}`);
      },
      async close() {
        record("input:close");
      },
    };
    return {
      video,
      input,
      async close() {
        await input.close();
        releaseTransport();
      },
    };
  }

  onStateChange(listener: (status: RuntimeStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Test helper: simulate an unexpected crash. */
  crash(): void {
    this.lastError = new AdapterError("CRASHED", "The runtime exited unexpectedly").toNormalized();
    this.transition("failed", "unhealthy");
  }

  private transition(state: RuntimeStatus["state"], health: RuntimeStatus["health"]): void {
    this.state = state;
    this.health = health;
    const status = this.snapshot();
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  private snapshot(): RuntimeStatus {
    return {
      state: this.state,
      health: this.health,
      startedAt: this.startedAt,
      lastError: this.lastError,
      restartAttempts: this.restartAttempts,
      adapterId: this.id,
      contractVersion: this.contractVersion,
    };
  }
}
