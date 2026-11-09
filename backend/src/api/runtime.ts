import type { FastifyInstance } from "fastify";
import type { StartOptions } from "../runtime/contract.js";
import type { Services } from "./services.js";

export function startOptions(services: Services): StartOptions {
  return {
    image: services.config.runtime.image,
    display: services.config.runtime.display,
    gpuMode: services.config.runtime.gpuMode,
    memoryLimitMb: services.config.runtime.memoryLimitMb,
    dataPath: services.config.storage.dataPath,
    adapterConfig: services.config.runtime.adapterConfig,
  };
}

export function registerRuntimeRoutes(app: FastifyInstance, services: Services): void {
  app.get("/api/runtime", { preHandler: services.authenticate }, async (request, reply) => {
    const status = await services.adapter.getStatus();
    let capabilities = null;
    if (status.state === "ready") {
      capabilities = await services.adapter.getCapabilities().catch(() => null);
    }
    return reply.send({
      state: status.state,
      health: status.health,
      adapter: status.adapterId,
      contractVersion: status.contractVersion,
      startedAt: status.startedAt,
      lastError: status.lastError,
      imageDigest: status.imageDigest,
      capabilities,
      isolation: { privileged: false, hostPid: false, hostNetwork: false },
    });
  });

  app.post("/api/runtime/start", { preHandler: services.authenticate }, async (_request, reply) => {
    void services.adapter.start(startOptions(services)).catch((error: Error) => {
      services.logger.error({ event: "runtime.start_failed", err: error.message }, "Runtime start failed");
    });
    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/runtime/stop", { preHandler: services.authenticate }, async (_request, reply) => {
    void services.adapter.stop().catch((error: Error) => {
      services.logger.error({ event: "runtime.stop_failed", err: error.message }, "Runtime stop failed");
    });
    return reply.code(202).send({ accepted: true });
  });

  app.post("/api/runtime/restart", { preHandler: services.authenticate }, async (_request, reply) => {
    void (async () => {
      await services.adapter.stop();
      await services.adapter.start(startOptions(services));
    })().catch((error: Error) => {
      services.logger.error({ event: "runtime.restart_failed", err: error.message }, "Runtime restart failed");
    });
    return reply.code(202).send({ accepted: true });
  });
}
