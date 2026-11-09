export const RUNTIME_CONTRACT_VERSION = "1.0.0";

export type RuntimeState =
  | "stopped"
  | "starting"
  | "ready"
  | "stopping"
  | "restarting"
  | "failed";

export type Health = "ok" | "degraded" | "unhealthy";

export interface NormalizedError {
  code: string;
  message: string;
  remediation: string;
  cause?: string;
}

export interface RuntimeStatus {
  state: RuntimeState;
  health: Health;
  startedAt: string | null;
  lastError: NormalizedError | null;
  restartAttempts: number;
  adapterId: string;
  contractVersion: string;
  imageDigest?: string;
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

export type StorageState = "ok" | "missing" | "read-only" | "unsafe" | "inconsistent";

export interface StorageStatus {
  path: string;
  state: StorageState;
  lastCheckedAt: string;
  sizeBytes?: number;
  message?: string;
}

export interface HostCheckResult {
  ok: boolean;
  checks: Array<{
    name: string;
    ok: boolean;
    message: string;
    remediation?: string;
  }>;
}

export interface StartOptions {
  image: string;
  display: { width: number; height: number; fps: number };
  gpuMode: "guest" | "host" | "auto";
  memoryLimitMb?: number;
  dataPath: string;
  adapterConfig: Record<string, unknown>;
}

export interface StopOptions {
  timeoutMs?: number;
}

export interface InstallOptions {
  artifactPath: string;
}

export interface VideoPacket {
  type: "configuration" | "data";
  data: Uint8Array;
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

export interface RuntimeTransport {
  readonly video: AsyncIterable<VideoPacket>;
  readonly input: InputSink;
  close(): Promise<void>;
}

export interface RuntimeAdapter {
  readonly id: string;
  readonly contractVersion: string;

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

export function isCompatibleContract(version: string): boolean {
  const [major] = version.split(".").map(Number);
  return major === 1;
}
