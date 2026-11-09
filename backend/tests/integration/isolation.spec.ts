import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const enabled = process.env.NEXPHONE_INTEGRATION === "1";

describe.skipIf(!enabled)("integration: isolation", () => {
  it("runs the runtime without privileged mode or host namespaces", async () => {
    const format = "{{json .HostConfig}}";
    const { stdout } = await execFileAsync("docker", [
      "inspect",
      "nexphone-runtime",
      "--format",
      format,
    ]);
    const hostConfig = JSON.parse(stdout) as {
      Privileged: boolean;
      PidMode: string;
      NetworkMode: string;
      Binds: string[] | null;
    };
    expect(hostConfig.Privileged).toBe(false);
    expect(hostConfig.PidMode).not.toBe("host");
    expect(hostConfig.NetworkMode).not.toBe("host");
    expect((hostConfig.Binds ?? []).join(",")).not.toContain("docker.sock");
  }, 30_000);
});
