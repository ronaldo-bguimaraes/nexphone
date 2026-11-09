import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface DeploymentHarness {
  compose(args: string[]): Promise<string>;
  logs(service: string, tail?: number): Promise<string>;
  isRuntimeRunning(): Promise<boolean>;
}

/**
 * Minimal helper for the @integration suite. Tests are excluded from default
 * CI; run them with NEXPHONE_INTEGRATION=1 on a KVM + binder host.
 */
export function createHarness(composeFile = "deploy/compose.yaml", envFile = "deploy/.env"): DeploymentHarness {
  const base = ["compose", "--env-file", envFile, "-f", composeFile];

  return {
    async compose(args) {
      const { stdout } = await execFileAsync("docker", [...base, ...args], {
        maxBuffer: 16 * 1024 * 1024,
      });
      return stdout;
    },
    async logs(service, tail = 200) {
      const { stdout } = await execFileAsync("docker", [...base, "logs", "--tail", String(tail), service], {
        maxBuffer: 16 * 1024 * 1024,
      });
      return stdout;
    },
    async isRuntimeRunning() {
      try {
        const { stdout } = await execFileAsync("docker", [
          "inspect",
          "nexphone-runtime",
          "--format",
          "{{.State.Running}}",
        ]);
        return stdout.trim() === "true";
      } catch {
        return false;
      }
    },
  };
}
