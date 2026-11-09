import { describe, expect, it } from "vitest";
import { FakeAdapter } from "../../src/runtime/fake/adapter.js";

const startOptions = {
  image: "fake",
  display: { width: 720, height: 1280, fps: 30 },
  gpuMode: "guest" as const,
  dataPath: "/tmp/nexphone",
  adapterConfig: {},
};

describe("application management contract", () => {
  it("installs and lists an application", async () => {
    const adapter = new FakeAdapter();
    await adapter.start(startOptions);
    const installed = await adapter.installApp({ artifactPath: "/tmp/sample.apk" });
    expect(installed.packageId).toBe("org.example.nexphone.sample");
    const apps = await adapter.listApps();
    expect(apps.map((app) => app.packageId)).toContain(installed.packageId);
  });

  it("launches and stops an application", async () => {
    const adapter = new FakeAdapter();
    await adapter.start(startOptions);
    const installed = await adapter.installApp({ artifactPath: "/tmp/sample.apk" });
    await adapter.launchApp(installed.packageId);
    expect((await adapter.listApps())[0]?.state).toBe("running");
    await adapter.stopApp(installed.packageId);
    expect((await adapter.listApps())[0]?.state).toBe("stopped");
  });

  it("reports a missing application", async () => {
    const adapter = new FakeAdapter();
    await adapter.start(startOptions);
    await expect(adapter.launchApp("org.example.missing")).rejects.toMatchObject({
      code: "APP_NOT_FOUND",
    });
  });

  it("reports an invalid artifact", async () => {
    const adapter = new FakeAdapter();
    await adapter.start(startOptions);
    await expect(adapter.installApp({ artifactPath: "/tmp/nope.zip" })).rejects.toMatchObject({
      code: "APP_CORRUPT",
    });
  });
});
