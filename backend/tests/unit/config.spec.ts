import { describe, expect, it } from "vitest";
import { configSchema } from "../../src/config/schema.js";

const base = {
  host: { binding: "lan", port: 8443, tls: { mode: "caddy-internal" } },
  runtime: {
    adapter: "redroid",
    image: `redroid/redroid@sha256:${"a".repeat(64)}`,
    display: { width: 720, height: 1280, fps: 30 },
  },
  storage: { dataPath: "/srv/nexphone/data", statePath: "/srv/nexphone/state" },
  auth: {},
  logging: {},
};

describe("configuration schema", () => {
  it("applies documented defaults", () => {
    const parsed = configSchema.parse(base);
    expect(parsed.auth.pairingTtlSeconds).toBe(300);
    expect(parsed.auth.sessionIdleTtlSeconds).toBe(43200);
    expect(parsed.auth.sessionAbsoluteTtlSeconds).toBe(86400);
    expect(parsed.logging.retentionDays).toBe(14);
    expect(parsed.runtime.gpuMode).toBe("guest");
  });

  it("rejects unknown keys", () => {
    expect(() => configSchema.parse({ ...base, surprise: true })).toThrow();
  });

  it("rejects floating image tags", () => {
    expect(() =>
      configSchema.parse({ ...base, runtime: { ...base.runtime, image: "redroid/redroid:14" } }),
    ).toThrow(/pinned image digest/);
  });

  it("requires certificate paths when TLS mode is provided", () => {
    expect(() =>
      configSchema.parse({ ...base, host: { ...base.host, tls: { mode: "provided" } } }),
    ).toThrow(/certPath/);
  });

  it("enforces display bounds", () => {
    expect(() =>
      configSchema.parse({
        ...base,
        runtime: { ...base.runtime, display: { width: 100, height: 1280, fps: 30 } },
      }),
    ).toThrow();
  });
});
