import { access } from "node:fs/promises";
import { constants } from "node:fs";
import Docker from "dockerode";
import type { Container, ContainerInspectInfo } from "dockerode";
import type { RuntimeConfig } from "../../config/schema.js";
import type { HostCheckResult, StorageStatus } from "../contract.js";

export interface ContainerOptions {
  config: RuntimeConfig;
  dataPath: string;
  /** Docker volume name to mount at /data. Falls back to dataPath for host runs. */
  dataVolume?: string;
  /** Docker network shared with the gateway. Falls back to the default bridge. */
  network?: string;
  containerName?: string;
}

export interface ContainerState {
  exists: boolean;
  running: boolean;
  id?: string;
  status?: string;
}

/**
 * Manages the lifecycle of the provisional Ruby-free Android container.
 * The container is deliberately NOT privileged: only the capabilities,
 * devices and mounts documented in ADR-0003 are granted.
 */
export class RedroidContainer {
  private readonly docker: Docker;
  private readonly name: string;
  private readonly config: RuntimeConfig;
  private readonly dataPath: string;
  private readonly dataVolume: string | undefined;
  private readonly network: string | undefined;

  constructor(options: ContainerOptions, docker = new Docker()) {
    this.docker = docker;
    this.config = options.config;
    this.dataPath = options.dataPath;
    this.dataVolume = options.dataVolume;
    this.network = options.network;
    this.name = options.containerName ?? "nexphone-runtime";
  }

  async validateHost(): Promise<HostCheckResult> {
    const checks: HostCheckResult["checks"] = [];

    checks.push(
      await this.check("docker", async () => {
        await this.docker.ping();
      }, "Docker Engine is reachable", "Install Docker Engine and ensure the service user can access it."),
    );

    checks.push(
      await this.check("kvm", async () => {
        await access("/dev/kvm", constants.R_OK | constants.W_OK);
      }, "/dev/kvm is accessible", "Enable hardware virtualization and add the service user to the kvm group."),
    );

    checks.push(
      await this.check("binder", async () => {
        await Promise.any([
          access("/dev/binderfs", constants.R_OK),
          access("/dev/binder", constants.R_OK),
        ]);
      }, "Android binder is available", "Load binder_linux (or mount binderfs) as documented."),
    );

    checks.push(
      await this.check("storage", async () => {
        await access(this.dataPath, constants.R_OK | constants.W_OK);
      }, "Persistent storage is writable", "Run the preflight script to create and permission the data directory."),
    );

    return { ok: checks.every((check) => check.ok), checks };
  }

  async inspect(): Promise<ContainerState> {
    try {
      const container = this.docker.getContainer(this.name);
      const info: ContainerInspectInfo = await container.inspect();
      return {
        exists: true,
        running: Boolean(info.State.Running),
        id: info.Id,
        status: info.State.Status,
      };
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) {
        return { exists: false, running: false };
      }
      throw error;
    }
  }

  async start(): Promise<void> {
    const state = await this.inspect();
    if (state.running) {
      return;
    }
    if (!state.exists) {
      await this.create();
    }
    const container = this.docker.getContainer(this.name);
    await container.start();
  }

  async stop(timeoutMs = 15_000): Promise<void> {
    const state = await this.inspect();
    if (!state.exists || !state.running) {
      return;
    }
    const container = this.docker.getContainer(this.name);
    await container.stop({ t: Math.max(1, Math.round(timeoutMs / 1000)) });
  }

  async remove(): Promise<void> {
    const state = await this.inspect();
    if (!state.exists) {
      return;
    }
    const container = this.docker.getContainer(this.name);
    if (state.running) {
      await container.stop({ t: 10 });
    }
    await container.remove({ force: true });
  }

  async logs(tail = 200): Promise<string> {
    const state = await this.inspect();
    if (!state.exists) {
      return "";
    }
    const container = this.docker.getContainer(this.name);
    const buffer = (await container.logs({
      stdout: true,
      stderr: true,
      tail,
    })) as unknown as Buffer;
    return buffer.toString("utf8");
  }

  async getIpAddress(): Promise<string | null> {
    const state = await this.inspect();
    if (!state.exists) {
      return null;
    }
    const info = await this.docker.getContainer(this.name).inspect();
    const networks = info.NetworkSettings?.Networks ?? {};
    for (const network of Object.values(networks)) {
      if (network?.IPAddress) {
        return network.IPAddress;
      }
    }
    return null;
  }

  private async create(): Promise<Container> {
    const display = this.config.display;
    const env = [
      `androidboot.redroid_width=${display.width}`,
      `androidboot.redroid_height=${display.height}`,
      `androidboot.redroid_fps=${display.fps}`,
      `androidboot.redroid_gpu_mode=${this.config.gpuMode === "auto" ? "guest" : this.config.gpuMode}`,
      "androidboot.use_memfd=true",
    ];

    const hostConfig: Docker.HostConfig = {
      // Hard isolation gate: never use Privileged: true.
      Privileged: false,
      CapAdd: ["SYS_ADMIN", "NET_ADMIN"],
      SecurityOpt: ["no-new-privileges"],
      // A named volume survives gateway restarts and is resolved by the host
      // daemon; a host path is used when the gateway runs directly on the host.
      Binds: [`${this.dataVolume ?? this.dataPath}:/data`],
      PortBindings: {
        "5555/tcp": [{ HostIp: "127.0.0.1", HostPort: "0" }],
      },
      Memory: this.config.memoryLimitMb ? this.config.memoryLimitMb * 1024 * 1024 : undefined,
      Devices:
        this.config.gpuMode === "host"
          ? [{ PathOnHost: "/dev/dri", PathInContainer: "/dev/dri", CgroupPermissions: "rwm" }]
          : [],
      NetworkMode: this.network ?? "bridge",
    };

    return this.docker.createContainer({
      name: this.name,
      Image: this.config.image,
      Tty: false,
      OpenStdin: false,
      HostConfig: hostConfig,
      Cmd: env,
      Labels: {
        "io.nexphone.runtime": "redroid",
        "io.nexphone.managed": "true",
      },
    });
  }

  private async check(
    name: string,
    fn: () => Promise<void>,
    okMessage: string,
    remediation: string,
  ): Promise<HostCheckResult["checks"][number]> {
    try {
      await fn();
      return { name, ok: true, message: okMessage };
    } catch (error) {
      return {
        name,
        ok: false,
        message: `${okMessage}: ${(error as Error).message}`,
        remediation,
      };
    }
  }
}

export type { StorageStatus };
