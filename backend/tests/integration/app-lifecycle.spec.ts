import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config/load.js";
import { RedroidAdapter } from "../../src/runtime/redroid/adapter.js";

const enabled = process.env.NEXPHONE_INTEGRATION === "1";
const apk = process.env.NEXPHONE_SAMPLE_APK ?? "backend/tests/fixtures/sample.apk";

describe.skipIf(!enabled)("integration: application lifecycle", () => {
  it("installs, launches and stops the sample application", async () => {
    await access(apk);
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

    const installed = await adapter.installApp({ artifactPath: apk });
    expect(installed.packageId).toMatch(/\./);
    await adapter.launchApp(installed.packageId);
    const listed = await adapter.listApps();
    expect(listed.find((app) => app.packageId === installed.packageId)?.state).toBe("running");
    await adapter.stopApp(installed.packageId);
    await adapter.stop();
  }, 300_000);
});
