import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface AdbRunOptions {
  timeoutMs?: number;
  maxBuffer?: number;
}

/**
 * Thin wrapper around the platform `adb` binary. All runtime-specific details
 * live on this side of the adapter boundary.
 */
export class AdbCli {
  constructor(readonly serial: string) {}

  async connect(host: string, port = 5555): Promise<void> {
    await this.run(["connect", `${host}:${port}`], { timeoutMs: 20_000 });
  }

  async disconnect(host: string, port = 5555): Promise<void> {
    await this.run(["disconnect", `${host}:${port}`], { timeoutMs: 10_000 });
  }

  async shell(command: string, options: AdbRunOptions = {}): Promise<string> {
    const { stdout } = await this.run(["-s", this.serial, "shell", command], options);
    return stdout.trim();
  }

  async getProp(name: string): Promise<string> {
    return this.shell(`getprop ${name}`);
  }

  async waitForBoot(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const booted = await this.getProp("sys.boot_completed");
        if (booted === "1") {
          return true;
        }
      } catch {
        // device not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  }

  async install(artifactPath: string): Promise<void> {
    await this.run(["-s", this.serial, "install", "-r", artifactPath], {
      timeoutMs: 180_000,
      maxBuffer: 16 * 1024 * 1024,
    });
  }

  async listThirdPartyPackages(): Promise<string[]> {
    const output = await this.shell("pm list packages -3");
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("package:"))
      .map((line) => line.slice("package:".length))
      .filter(Boolean);
  }

  async packageInfo(packageId: string): Promise<{ versionName: string; versionCode: number }> {
    try {
      const output = await this.shell(`dumpsys package ${packageId}`, {
        maxBuffer: 8 * 1024 * 1024,
      });
      const versionName = /versionName=([^\s]+)/.exec(output)?.[1] ?? "unknown";
      const versionCode = Number(/versionCode=(\d+)/.exec(output)?.[1] ?? 0);
      return { versionName, versionCode };
    } catch {
      return { versionName: "unknown", versionCode: 0 };
    }
  }

  async isRunning(packageId: string): Promise<boolean> {
    try {
      const output = await this.shell(`pidof ${packageId}`);
      return output.length > 0;
    } catch {
      return false;
    }
  }

  async launch(packageId: string): Promise<void> {
    await this.shell(
      `monkey -p ${packageId} -c android.intent.category.LAUNCHER 1`,
      { timeoutMs: 30_000 },
    );
  }

  async forceStop(packageId: string): Promise<void> {
    await this.shell(`am force-stop ${packageId}`);
  }

  private async run(
    args: string[],
    options: AdbRunOptions = {},
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execFileAsync("adb", args, {
        timeout: options.timeoutMs ?? 30_000,
        maxBuffer: options.maxBuffer ?? 8 * 1024 * 1024,
        windowsHide: true,
      });
      return { stdout: String(result.stdout), stderr: String(result.stderr) };
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
      const detail = (err.stderr || err.stdout || err.message || "").toString().trim();
      throw new Error(`adb ${args.join(" ")} failed: ${detail}`, { cause: error });
    }
  }
}
