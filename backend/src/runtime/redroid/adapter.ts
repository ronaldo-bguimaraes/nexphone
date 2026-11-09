import type { NexPhoneConfig } from "../../config/schema.js";
import type {
  ApplicationInfo,
  HostCheckResult,
  InstallOptions,
  RuntimeAdapter,
  RuntimeCapabilities,
  RuntimeStatus,
  RuntimeTransport,
  StartOptions,
  StopOptions,
  StorageStatus,
} from "../contract.js";
import { RUNTIME_CONTRACT_VERSION } from "../contract.js";
import { AdapterError, normalizeError } from "../errors.js";
import { ensureStore, inspectStore, markRunning, markStopped } from "../../storage/environment.js";
import { AdbCli } from "./adb.js";
import { RedroidApps } from "./apps.js";
import { RedroidContainer, type ContainerState } from "./container.js";
import { ScrcpyBridge } from "./streaming.js";

export interface RedroidAdapterOptions {
  container?: RedroidContainer;
  createAdb?: (serial: string) => AdbCli;
  monitor?: boolean;
  scrcpyServerPath?: string;
}

const MAX_RESTART_ATTEMPTS = 2;

export class RedroidAdapter implements RuntimeAdapter {
  readonly id = "redroid";
  readonly contractVersion = RUNTIME_CONTRACT_VERSION;

  private readonly container: RedroidContainer;
  private readonly createAdb: (serial: string) => AdbCli;
  private readonly monitorEnabled: boolean;
  private readonly scrcpyServerPath: string;
  private readonly listeners = new Set<(status: RuntimeStatus) => void>();
  private readonly dataPath: string;
  private readonly config: NexPhoneConfig;

  private state: RuntimeStatus["state"] = "stopped";
  private health: RuntimeStatus["health"] = "ok";
  private startedAt: string | null = null;
  private lastError: RuntimeStatus["lastError"] = null;
  private restartAttempts = 0;
  private adb: AdbCli | null = null;
  private monitorTimer: NodeJS.Timeout | null = null;

  constructor(config: NexPhoneConfig, options: RedroidAdapterOptions = {}) {
    this.config = config;
    this.dataPath = config.storage.dataPath;
    this.container =
      options.container ??
      new RedroidContainer({
        config: config.runtime,
        dataPath: this.dataPath,
        dataVolume: process.env.NEXPHONE_RUNTIME_DATA_VOLUME,
        network: process.env.NEXPHONE_RUNTIME_NETWORK,
      });
    this.createAdb = options.createAdb ?? ((serial) => new AdbCli(serial));
    this.monitorEnabled = options.monitor ?? true;
    this.scrcpyServerPath =
      options.scrcpyServerPath ??
      process.env.NEXPHONE_SCRCPY_SERVER ??
      "/opt/nexphone/scrcpy-server.jar";
  }

  async validateHost(): Promise<HostCheckResult> {
    return this.container.validateHost();
  }

  async start(options: StartOptions): Promise<void> {
    if (this.state === "ready") {
      return;
    }
    this.restartAttempts = 0;
    await this.startInternal(options);
  }

  private async startInternal(options: StartOptions): Promise<void> {
    this.state = "starting";
    this.health = "ok";
    this.emit();

    const storage = await inspectStore(this.dataPath);
    if (storage.state === "missing") {
      const created = await ensureStore(this.dataPath);
      if (created.state !== "ok") {
        this.fail(new AdapterError("STORAGE_UNAVAILABLE", created.message ?? "Storage is unavailable"));
        throw this.lastErrorAsException();
      }
    } else if (storage.state !== "ok") {
      this.fail(
        new AdapterError("STORAGE_UNAVAILABLE", storage.message ?? "Storage is unavailable"),
      );
      throw this.lastErrorAsException();
    }

    try {
      await markRunning(this.dataPath);
      await this.container.start();
      const ip = await this.container.getIpAddress();
      if (!ip) {
        throw new AdapterError("START_FAILED", "The runtime did not receive a network address");
      }
      const serial = `${ip}:5555`;
      this.adb = this.createAdb(serial);
      await this.adb.connect(ip, 5555);
      const booted = await this.adb.waitForBoot(120_000);
      if (!booted) {
        throw new AdapterError("READY_TIMEOUT", "The runtime did not finish booting in time");
      }
      this.startedAt = new Date().toISOString();
      this.state = "ready";
      this.health = "ok";
      this.lastError = null;
      this.emit();
      this.startMonitor();
      void options;
    } catch (error) {
      await markStopped(this.dataPath).catch(() => undefined);
      if (error instanceof AdapterError && error.code === "READY_TIMEOUT") {
        this.fail(error);
      } else {
        this.fail(
          error instanceof AdapterError
            ? error
            : new AdapterError("START_FAILED", "The runtime failed to start", (error as Error).message),
        );
      }
      throw this.lastErrorAsException();
    }
  }

  async stop(_options?: StopOptions): Promise<void> {
    this.stopMonitor();
    if (this.state === "stopped") {
      return;
    }
    this.state = "stopping";
    this.health = "degraded";
    this.emit();
    try {
      await this.container.stop();
    } finally {
      await markStopped(this.dataPath).catch(() => undefined);
      this.startedAt = null;
      this.state = "stopped";
      this.health = "ok";
      this.lastError = null;
      this.emit();
    }
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
      imageDigest: this.config.runtime.image,
    };
  }

  async waitForReady(timeoutMs: number): Promise<RuntimeStatus> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (this.state === "ready") {
        return this.getStatus();
      }
      if (this.state === "failed") {
        throw this.lastErrorAsException();
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new AdapterError("READY_TIMEOUT", "The runtime did not become ready in time");
  }

  async getCapabilities(): Promise<RuntimeCapabilities> {
    if (!this.adb) {
      throw new AdapterError("NOT_SUPPORTED", "The runtime has not started");
    }
    const [release, sdk, abiList] = await Promise.all([
      this.adb.getProp("ro.build.version.release"),
      this.adb.getProp("ro.build.version.sdk"),
      this.adb.getProp("ro.product.cpu.abilist"),
    ]);
    return {
      androidVersion: release || "unknown",
      apiLevel: Number(sdk) || 0,
      abiList: abiList ? abiList.split(",").map((value) => value.trim()) : [],
      displayWidth: this.config.runtime.display.width,
      displayHeight: this.config.runtime.display.height,
      fps: this.config.runtime.display.fps,
      gpuMode: this.config.runtime.gpuMode === "host" ? "host" : "guest",
      features: { multiTouch: true, rotation: true },
    };
  }

  async getStorageStatus(): Promise<StorageStatus> {
    return inspectStore(this.dataPath);
  }

  async listApps(): Promise<ApplicationInfo[]> {
    return this.requireApps().list();
  }

  async installApp(options: InstallOptions): Promise<ApplicationInfo> {
    return this.requireApps().install(options.artifactPath);
  }

  async launchApp(packageId: string): Promise<void> {
    await this.requireApps().launch(packageId);
  }

  async stopApp(packageId: string): Promise<void> {
    await this.requireApps().stop(packageId);
  }

  async openTransport(): Promise<RuntimeTransport> {
    if (this.state !== "ready" || !this.adb) {
      throw new AdapterError("STREAM_FAILED", "The runtime is not ready");
    }
    const serial = this.adb.serial;
    const bridge = new ScrcpyBridge({
      serial,
      serverJarPath: this.scrcpyServerPath,
      display: this.config.runtime.display,
    });
    return bridge.open();
  }

  onStateChange(listener: (status: RuntimeStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private requireApps(): RedroidApps {
    if (!this.adb || this.state !== "ready") {
      throw new AdapterError("NOT_SUPPORTED", "The runtime is not ready");
    }
    return new RedroidApps(this.adb);
  }

  private fail(error: AdapterError): void {
    this.lastError = error.toNormalized();
    this.state = "failed";
    this.health = "unhealthy";
    this.emit();
  }

  private lastErrorAsException(): AdapterError {
    if (!this.lastError) {
      return new AdapterError("INTERNAL", "Unexpected runtime failure");
    }
    return new AdapterError(this.lastError.code as never, this.lastError.message, this.lastError.cause);
  }

  private emit(): void {
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
      imageDigest: this.config.runtime.image,
    };
  }

  private startMonitor(): void {
    if (!this.monitorEnabled || this.monitorTimer) {
      return;
    }
    this.monitorTimer = setInterval(() => {
      void this.checkAlive();
    }, 5_000);
    this.monitorTimer.unref?.();
  }

  private stopMonitor(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  private async checkAlive(): Promise<void> {
    if (this.state !== "ready") {
      return;
    }
    let state: ContainerState;
    try {
      state = await this.container.inspect();
    } catch (error) {
      this.lastError = normalizeError(error);
      return;
    }
    if (state.running) {
      return;
    }
    this.handleCrash();
  }

  private handleCrash(): void {
    this.lastError = new AdapterError("CRASHED", "The runtime exited unexpectedly").toNormalized();
    this.health = "unhealthy";
    if (this.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      this.state = "failed";
      this.emit();
      return;
    }
    this.restartAttempts += 1;
    this.state = "restarting";
    this.emit();
    void this.startInternal({
      image: this.config.runtime.image,
      display: this.config.runtime.display,
      gpuMode: this.config.runtime.gpuMode,
      memoryLimitMb: this.config.runtime.memoryLimitMb,
      dataPath: this.dataPath,
      adapterConfig: this.config.runtime.adapterConfig,
    }).catch(() => {
      this.state = "failed";
      this.health = "unhealthy";
      this.emit();
    });
  }
}
