import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/load.js";
import { RedroidAdapter } from "../../src/runtime/redroid/adapter.js";

const enabled = process.env.NEXPHONE_INTEGRATION === "1";

describe.skipIf(!enabled)("integration: runtime lifecycle", () => {
  it("starts, reports ready, and stops", async () => {
    const config = await loadConfig({ path: process.env.NEXPHONE_CONFIG ?? "config/nexphone.yaml" });
    const adapter = new RedroidAdapter(config);
    const host = await adapter.validateHost();
    expect(host.ok, JSON.stringify(host.checks, null, 2)).toBe(true);

    await adapter.start({
      image: config.runtime.image,
      display: config.runtime.display,
      gpuMode: config.runtime.gpuMode,
      memoryLimitMb: config.runtime.memoryLimitMb,
      dataPath: config.storage.dataPath,
      adapterConfig: config.runtime.adapterConfig,
    });
    const status = await adapter.waitForReady(180_000);
    expect(status.state).toBe("ready");

    const capabilities = await adapter.getCapabilities();
    expect(capabilities.androidVersion).not.toBe("unknown");
    expect(capabilities.abiList.length).toBeGreaterThan(0);

    await adapter.stop();
    expect((await adapter.getStatus()).state).toBe("stopped");
  }, 240_000);
});
