import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/load.js";
import { RedroidAdapter } from "../../src/runtime/redroid/adapter.js";
import { AdbCli } from "../../src/runtime/redroid/adb.js";
import { inspectStore } from "../../src/storage/environment.js";

const enabled = process.env.NEXPHONE_INTEGRATION === "1";

describe.skipIf(!enabled)("integration: persistence", () => {
  it("keeps data across a runtime restart", async () => {
    const config = await loadConfig({ path: process.env.NEXPHONE_CONFIG ?? "config/nexphone.yaml" });
    const adapter = new RedroidAdapter(config);
    const startOptions = {
      image: config.runtime.image,
      display: config.runtime.display,
      gpuMode: config.runtime.gpuMode,
      dataPath: config.storage.dataPath,
      adapterConfig: config.runtime.adapterConfig,
    };

    await adapter.start(startOptions);
    await adapter.waitForReady(180_000);
    const ip = (adapter as unknown as { adb: AdbCli }).adb;
    const marker = `/sdcard/nexphone-persistence-${Date.now()}`;
    await ip.shell(`mkdir -p ${marker} && echo ok > ${marker}/marker`);

    await adapter.stop();
    expect((await inspectStore(config.storage.dataPath)).state).toBe("ok");

    await adapter.start(startOptions);
    await adapter.waitForReady(180_000);
    const restored = (adapter as unknown as { adb: AdbCli }).adb;
    expect(await restored.shell(`cat ${marker}/marker`)).toBe("ok");
    await adapter.stop();
  }, 600_000);
});
