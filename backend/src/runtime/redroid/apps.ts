import type { ApplicationInfo } from "../contract.js";
import { AdapterError } from "../errors.js";
import type { AdbCli } from "./adb.js";

export class RedroidApps {
  constructor(private readonly adb: AdbCli) {}

  async list(): Promise<ApplicationInfo[]> {
    const packages = await this.adb.listThirdPartyPackages();
    const apps: ApplicationInfo[] = [];
    for (const packageId of packages) {
      const [info, running] = await Promise.all([
        this.adb.packageInfo(packageId),
        this.adb.isRunning(packageId),
      ]);
      apps.push({
        packageId,
        label: packageId,
        versionName: info.versionName,
        versionCode: info.versionCode,
        state: running ? "running" : "installed",
        installedAt: new Date().toISOString(),
        lastLaunchedAt: null,
      });
    }
    return apps;
  }

  async install(artifactPath: string): Promise<ApplicationInfo> {
    if (!artifactPath.endsWith(".apk")) {
      throw new AdapterError("APP_CORRUPT", "The provided artifact is not an APK");
    }
    const before = new Set(await this.adb.listThirdPartyPackages());
    try {
      await this.adb.install(artifactPath);
    } catch (error) {
      const message = (error as Error).message.toLowerCase();
      if (message.includes("incompatible") || message.includes("abi")) {
        throw new AdapterError("APP_INCOMPATIBLE", "The package is incompatible with the runtime");
      }
      if (message.includes("corrupt") || message.includes("parse")) {
        throw new AdapterError("APP_CORRUPT", "The package could not be parsed");
      }
      throw new AdapterError("APP_LAUNCH_FAILED", "The package could not be installed", message);
    }

    const packages = await this.adb.listThirdPartyPackages();
    const packageId =
      packages.find((candidate) => !before.has(candidate)) ?? packages.at(-1);
    if (!packageId) {
      throw new AdapterError("APP_NOT_FOUND", "Installation succeeded but the package was not found");
    }
    const info = await this.adb.packageInfo(packageId);
    return {
      packageId,
      label: packageId,
      versionName: info.versionName,
      versionCode: info.versionCode,
      state: "installed",
      installedAt: new Date().toISOString(),
      lastLaunchedAt: null,
    };
  }

  async launch(packageId: string): Promise<void> {
    const installed = await this.adb.listThirdPartyPackages();
    if (!installed.includes(packageId)) {
      throw new AdapterError("APP_NOT_FOUND", `Application ${packageId} is not installed`);
    }
    try {
      await this.adb.launch(packageId);
    } catch (error) {
      throw new AdapterError("APP_LAUNCH_FAILED", `Could not launch ${packageId}`, (error as Error).message);
    }
  }

  async stop(packageId: string): Promise<void> {
    const installed = await this.adb.listThirdPartyPackages();
    if (!installed.includes(packageId)) {
      throw new AdapterError("APP_NOT_FOUND", `Application ${packageId} is not installed`);
    }
    await this.adb.forceStop(packageId);
  }
}
