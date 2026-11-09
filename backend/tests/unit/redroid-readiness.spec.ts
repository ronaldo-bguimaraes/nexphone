import { describe, expect, it } from "vitest";
import { AdbCli } from "../../src/runtime/redroid/adb.js";
import { FakeAdapter } from "../../src/runtime/fake/adapter.js";
import { AdapterError } from "../../src/runtime/errors.js";

class FakeAdb extends AdbCli {
  constructor(private readonly bootValue: string) {
    super("127.0.0.1:5555");
  }

  override async getProp(): Promise<string> {
    return this.bootValue;
  }
}

describe("runtime readiness", () => {
  it("detects boot completion", async () => {
    const adb = new FakeAdb("1");
    expect(await adb.waitForBoot(100)).toBe(true);
  });

  it("resolves when the fake runtime becomes ready", async () => {
    const adapter = new FakeAdapter();
    await adapter.start({
      image: "fake",
      display: { width: 720, height: 1280, fps: 30 },
      gpuMode: "guest",
      dataPath: "/tmp",
      adapterConfig: {},
    });
    const status = await adapter.waitForReady(1000);
    expect(status.state).toBe("ready");
  });

  it("times out when the runtime never becomes ready", async () => {
    const adapter = new FakeAdapter();
    await expect(adapter.waitForReady(20)).rejects.toBeInstanceOf(AdapterError);
  });

  it("reports a failed start", async () => {
    const adapter = new FakeAdapter({ failStartWith: "START_FAILED" });
    await expect(
      adapter.start({
        image: "fake",
        display: { width: 720, height: 1280, fps: 30 },
        gpuMode: "guest",
        dataPath: "/tmp",
        adapterConfig: {},
      }),
    ).rejects.toBeInstanceOf(AdapterError);
    expect((await adapter.getStatus()).state).toBe("failed");
  });

  it("emits exactly one transition per state change", async () => {
    const adapter = new FakeAdapter();
    const states: string[] = [];
    adapter.onStateChange((status) => states.push(status.state));
    await adapter.start({
      image: "fake",
      display: { width: 720, height: 1280, fps: 30 },
      gpuMode: "guest",
      dataPath: "/tmp",
      adapterConfig: {},
    });
    expect(states).toEqual(["starting", "ready"]);
  });
});
