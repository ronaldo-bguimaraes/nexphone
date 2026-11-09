import { describe, expect, it } from "vitest";
import { AdapterError, normalizeError, remediationFor } from "../../src/runtime/errors.js";

describe("normalized errors", () => {
  it("maps adapter errors with remediation", () => {
    const normalized = new AdapterError("READY_TIMEOUT", "timed out", "boot log").toNormalized();
    expect(normalized.code).toBe("READY_TIMEOUT");
    expect(normalized.remediation).toMatch(/did not become ready/);
    expect(normalized.cause).toBe("boot log");
  });

  it("maps unknown errors to INTERNAL", () => {
    expect(normalizeError(new Error("boom"))).toMatchObject({ code: "INTERNAL", message: "boom" });
    expect(normalizeError("nope").code).toBe("INTERNAL");
  });

  it("provides remediation for every code", () => {
    for (const code of [
      "PREREQUISITE_MISSING",
      "START_FAILED",
      "READY_TIMEOUT",
      "CRASHED",
      "APP_NOT_FOUND",
      "APP_INCOMPATIBLE",
      "APP_CORRUPT",
      "APP_LAUNCH_FAILED",
      "STORAGE_UNAVAILABLE",
      "STREAM_FAILED",
      "INPUT_REJECTED",
      "SESSION_BUSY",
      "NOT_SUPPORTED",
      "INTERNAL",
    ] as const) {
      expect(remediationFor(code).length).toBeGreaterThan(10);
    }
  });
});
