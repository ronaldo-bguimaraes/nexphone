import { describe, expect, it } from "vitest";
import type { AdbCli } from "../../src/runtime/redroid/adb.js";
import { RedroidApps } from "../../src/runtime/redroid/apps.js";
import { AdapterError } from "../../src/runtime/errors.js";

function fakeAdb(overrides: Partial<Record<keyof AdbCli, unknown>> = {}): AdbCli {
  const base = {
    listThirdPartyPackages: async () => ["org.example.sample"],
    packageInfo: async () => ({ versionName: "2.1", versionCode: 21 }),
    isRunning: async () => false,
    install: async () => undefined,
    launch: async () => undefined,
    forceStop: async () => undefined,
  };
  return { ...base, ...overrides } as unknown as AdbCli;
}

describe("redroid application management", () => {
  it("lists installed applications", async () => {
    const apps = await new RedroidApps(fakeAdb()).list();
    expect(apps).toEqual([
      expect.objectContaining({
        packageId: "org.example.sample",
        versionName: "2.1",
        versionCode: 21,
        state: "installed",
      }),
    ]);
  });

  it("maps a missing package to APP_NOT_FOUND", async () => {
    const apps = new RedroidApps(fakeAdb({ listThirdPartyPackages: async () => [] }));
    await expect(apps.launch("org.example.missing")).rejects.toMatchObject({
      code: "APP_NOT_FOUND",
    });
  });

  it("maps incompatible install failures", async () => {
    const apps = new RedroidApps(
      fakeAdb({
        install: async () => {
          throw new Error("INSTALL_FAILED_NO_MATCHING_ABIS: incompatible abi");
        },
      }),
    );
    await expect(apps.install("/tmp/app.apk")).rejects.toMatchObject({
      code: "APP_INCOMPATIBLE",
    });
  });

  it("rejects non-APK artifacts", async () => {
    const apps = new RedroidApps(fakeAdb());
    await expect(apps.install("/tmp/app.zip")).rejects.toBeInstanceOf(AdapterError);
  });

  it("launches and stops a known package", async () => {
    const calls: string[] = [];
    const apps = new RedroidApps(
      fakeAdb({
        launch: async () => void calls.push("launch"),
        forceStop: async () => void calls.push("stop"),
      }),
    );
    await apps.launch("org.example.sample");
    await apps.stop("org.example.sample");
    expect(calls).toEqual(["launch", "stop"]);
  });
});
