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

export interface NormalizedError {
  code: AdapterErrorCode;
  message: string;
  remediation: string;
  cause?: string;
}

const REMEDIATION: Record<AdapterErrorCode, string> = {
  PREREQUISITE_MISSING:
    "Check the documented host prerequisites (virtualization, kernel modules, permissions) and re-run the preflight script.",
  START_FAILED: "Inspect the runtime logs, verify the pinned image, then retry the start operation.",
  READY_TIMEOUT:
    "The runtime did not become ready in time. Check host resources and runtime logs, then restart it.",
  CRASHED: "The runtime exited unexpectedly. Check logs and restart; if it repeats, review host resources.",
  APP_NOT_FOUND: "Install the application first, then confirm its package identifier.",
  APP_INCOMPATIBLE:
    "The package targets an unsupported ABI or Android version. Install a compatible build.",
  APP_CORRUPT: "Re-download the package and verify its checksum before installing again.",
  APP_LAUNCH_FAILED:
    "The application could not be launched. Check that it is installed and does not require unsupported hardware.",
  STORAGE_UNAVAILABLE:
    "Verify the data path exists, is a directory and is writable by the service user. Do not delete existing data.",
  STREAM_FAILED: "The screen stream stopped. Reconnect the session; if it persists, restart the runtime.",
  INPUT_REJECTED: "The input was outside the current display bounds. Refresh the screen and try again.",
  SESSION_BUSY: "Another session is active. Revoke it from the host before pairing again.",
  NOT_SUPPORTED: "This capability is not available in the current runtime or deployment.",
  INTERNAL: "An unexpected error occurred. Check the logs using the correlation ID.",
};

export class AdapterError extends Error {
  override readonly name = "AdapterError";

  constructor(
    readonly code: AdapterErrorCode,
    message: string,
    readonly causeText?: string,
  ) {
    super(message);
  }

  toNormalized(): NormalizedError {
    return {
      code: this.code,
      message: this.message,
      remediation: REMEDIATION[this.code],
      ...(this.causeText ? { cause: this.causeText } : {}),
    };
  }
}

export function remediationFor(code: AdapterErrorCode): string {
  return REMEDIATION[code];
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof AdapterError) {
    return error.toNormalized();
  }
  if (error instanceof Error) {
    return {
      code: "INTERNAL",
      message: error.message || "Unexpected error",
      remediation: REMEDIATION.INTERNAL,
    };
  }
  return {
    code: "INTERNAL",
    message: "Unexpected error",
    remediation: REMEDIATION.INTERNAL,
  };
}
