import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type Docker from "dockerode";
import { RedroidContainer } from "../../src/runtime/redroid/container.js";
import type { RuntimeConfig } from "../../src/config/schema.js";

const runtimeConfig: RuntimeConfig = {
  adapter: "redroid",
  image: `redroid/redroid@sha256:${"b".repeat(64)}`,
  display: { width: 720, height: 1280, fps: 30 },
  gpuMode: "guest",
  adapterConfig: {},
};

const created: string[] = [];
afterEach(async () => {
  for (const dir of created.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function dataDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "nexphone-container-"));
  created.push(dir);
  return dir;
}

function fakeDocker() {
  let exists = false;
  let running = false;
  const createCalls: Array<Record<string, unknown>> = [];
  const docker = {
    ping: async () => ({}),
    getContainer: () => ({
      inspect: async () => {
        if (!exists) {
          throw Object.assign(new Error("not found"), { statusCode: 404 });
        }
        return {
          Id: "abc",
          State: { Running: running, Status: running ? "running" : "exited" },
          NetworkSettings: { Networks: { bridge: { IPAddress: "172.17.0.5" } } },
        };
      },
      start: async () => {
        running = true;
      },
      stop: async () => {
        running = false;
      },
      remove: async () => {
        exists = false;
      },
      logs: async () => Buffer.from("log line"),
    }),
    createContainer: async (config: Record<string, unknown>) => {
      createCalls.push(config);
      exists = true;
      return {};
    },
  };
  return { docker: docker as unknown as Docker, createCalls, isRunning: () => running };
}

describe("redroid container", () => {
  it("reports absence and starts a container", async () => {
    const { docker, createCalls, isRunning } = fakeDocker();
    const dir = await dataDir();
    const container = new RedroidContainer({ config: runtimeConfig, dataPath: dir }, docker);

    expect(await container.inspect()).toMatchObject({ exists: false, running: false });
    await container.start();
    expect(isRunning()).toBe(true);
    expect(createCalls).toHaveLength(1);
    expect(await container.inspect()).toMatchObject({ exists: true, running: true });
  });

  it("never requests privileged mode", async () => {
    const { docker, createCalls } = fakeDocker();
    const dir = await dataDir();
    const container = new RedroidContainer({ config: runtimeConfig, dataPath: dir }, docker);
    await container.start();
    const hostConfig = createCalls[0]?.HostConfig as Record<string, unknown>;
    expect(hostConfig.Privileged).toBe(false);
    expect(hostConfig.NetworkMode).toBe("bridge");
    expect(JSON.stringify(hostConfig.Binds)).not.toContain("docker.sock");
  });

  it("reports the container IP address", async () => {
    const { docker } = fakeDocker();
    const dir = await dataDir();
    const container = new RedroidContainer({ config: runtimeConfig, dataPath: dir }, docker);
    await container.start();
    expect(await container.getIpAddress()).toBe("172.17.0.5");
  });

  it("returns a structured host check result", async () => {
    const { docker } = fakeDocker();
    const dir = await dataDir();
    const container = new RedroidContainer({ config: runtimeConfig, dataPath: dir }, docker);
    const result = await container.validateHost();
    expect(result.checks.map((check) => check.name)).toEqual(["docker", "kvm", "binder", "storage"]);
    expect(typeof result.ok).toBe("boolean");
  });
});
