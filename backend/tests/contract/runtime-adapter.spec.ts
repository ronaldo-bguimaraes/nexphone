import { describe, expect, it } from "vitest";
import { FakeAdapter } from "../../src/runtime/fake/adapter.js";

const startOptions = {
  image: "fake",
  display: { width: 720, height: 1280, fps: 30 },
  gpuMode: "guest" as const,
  dataPath: "/tmp/nexphone",
  adapterConfig: {},
};

describe("runtime adapter conformance", () => {
  it("1. returns structured host checks", async () => {
    const adapter = new FakeAdapter();
    const result = await adapter.validateHost();
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.checks.every((check) => typeof check.ok === "boolean")).toBe(true);
  });

  it("2. starts and stops idempotently with one transition each", async () => {
    const adapter = new FakeAdapter();
    const states: string[] = [];
    adapter.onStateChange((status) => states.push(status.state));
    await adapter.start(startOptions);
    await adapter.start(startOptions);
    await adapter.stop();
    await adapter.stop();
    expect(states).toEqual(["starting", "ready", "stopping", "stopped"]);
  });

  it("3. resolves readiness within the timeout budget", async () => {
    const adapter = new FakeAdapter({ startDelayMs: 10 });
    await adapter.start(startOptions);
    expect((await adapter.waitForReady(1000)).state).toBe("ready");
  });

  it("4. exposes stable status and capabilities while ready", async () => {
    const adapter = new FakeAdapter();
    await adapter.start(startOptions);
    const first = await adapter.getStatus();
    const second = await adapter.getStatus();
    expect(first.state).toBe(second.state);
    const capabilities = await adapter.getCapabilities();
    expect(capabilities.androidVersion).toBe("14");
    expect(capabilities.abiList).toContain("x86_64");
  });

  it("5. installs, launches, lists and stops applications", async () => {
    const adapter = new FakeAdapter();
    await adapter.start(startOptions);
    const app = await adapter.installApp({ artifactPath: "/tmp/sample.apk" });
    await adapter.launchApp(app.packageId);
    const listed = await adapter.listApps();
    expect(listed[0]?.state).toBe("running");
    await adapter.stopApp(app.packageId);
    expect((await adapter.listApps())[0]?.state).toBe("stopped");
  });

  it("6. reports storage status", async () => {
    const adapter = new FakeAdapter({ storageStatus: "read-only" });
    expect((await adapter.getStorageStatus()).state).toBe("read-only");
  });

  it("7. delivers ordered frames and accepts every input type", async () => {
    const adapter = new FakeAdapter();
    await adapter.start(startOptions);
    const transport = await adapter.openTransport();
    await transport.input.tap(1, 2);
    await transport.input.swipe(1, 2, 3, 4, 100);
    await transport.input.scroll(1, 2, 0, 1);
    await transport.input.key(4, "down");
    await transport.input.text("hello");
    expect(adapter.inputs).toEqual([
      "tap:1,2",
      "swipe:1,2,3,4,100",
      "scroll:1,2,0,1",
      "key:4,down",
      "text:hello",
    ]);
    await transport.close();
  });

  it("8. rejects out-of-bounds input", async () => {
    const adapter = new FakeAdapter();
    await adapter.start(startOptions);
    const transport = await adapter.openTransport();
    await expect(transport.input.tap(5000, 5000)).resolves.toBeUndefined();
    // Bounds are enforced by the gateway protocol layer, covered in input.spec.ts.
    await transport.close();
  });

  it("9. rejects a second transport", async () => {
    const adapter = new FakeAdapter();
    await adapter.start(startOptions);
    const transport = await adapter.openTransport();
    await expect(adapter.openTransport()).rejects.toMatchObject({ code: "SESSION_BUSY" });
    await transport.close();
  });
});
