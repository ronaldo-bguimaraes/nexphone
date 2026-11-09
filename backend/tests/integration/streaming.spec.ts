import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/load.js";
import { RedroidAdapter } from "../../src/runtime/redroid/adapter.js";

const enabled = process.env.NEXPHONE_INTEGRATION === "1";

describe.skipIf(!enabled)("integration: streaming", () => {
  it("delivers video and measures input latency", async () => {
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

    const transport = await adapter.openTransport();
    const iterator = transport.video[Symbol.asyncIterator]();
    const first = await Promise.race([
      iterator.next(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("no video packet within 15 seconds")), 15_000),
      ),
    ]);
    expect(first.done).toBe(false);
    expect(first.value?.type).toBe("configuration");

    const started = performance.now();
    await transport.input.tap(100, 100);
    const latency = performance.now() - started;
    expect(latency).toBeGreaterThanOrEqual(0);

    await transport.close();
    await adapter.stop();
  }, 300_000);
});
