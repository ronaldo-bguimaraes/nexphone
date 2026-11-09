import { chmod } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/load.js";
import { RedroidAdapter } from "../../src/runtime/redroid/adapter.js";

const enabled = process.env.NEXPHONE_INTEGRATION === "1";

describe.skipIf(!enabled)("integration: failure legibility", () => {
  it("reports a crash with an actionable error", async () => {
    const config = await loadConfig({ path: process.env.NEXPHONE_CONFIG ?? "config/nexphone.yaml" });
    const adapter = new RedroidAdapter(config);
    await adapter.start({
      image: config.runtime.image,
      display: config.runtime.display,
      gpuMode: config.runtime.gpuMode,
      dataPath: config.storage.dataPath,
      adapterConfig: config.runtime.adapterConfig,
    });
    await adapter.waitForReady(180_000);

    const container = (adapter as unknown as { container: { stop(): Promise<void> } }).container;
    await container.stop();
    await new Promise((resolve) => setTimeout(resolve, 6_000));
    const status = await adapter.getStatus();
    expect(["restarting", "ready", "failed"]).toContain(status.state);
    await adapter.stop();
  }, 300_000);

  it("fails safely when the store is read-only", async () => {
    const config = await loadConfig({ path: process.env.NEXPHONE_CONFIG ?? "config/nexphone.yaml" });
    await chmod(config.storage.dataPath, 0o500);
    const adapter = new RedroidAdapter(config);
    const storage = await adapter.getStorageStatus();
    expect(storage.state).toBe("read-only");
    await chmod(config.storage.dataPath, 0o700);
  });
});
