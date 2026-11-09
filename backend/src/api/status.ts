import type { FastifyInstance } from "fastify";
import type { Services } from "./services.js";

export function registerStatusRoutes(app: FastifyInstance, services: Services): void {
  app.get("/api/status", { preHandler: services.authenticate }, async () => {
    const [runtime, storage, sessions] = await Promise.all([
      services.adapter.getStatus(),
      services.adapter.getStorageStatus(),
      services.sessions.activeCount(),
    ]);
    return {
      version: "0.1.0",
      runtime: {
        state: runtime.state,
        health: runtime.health,
        adapter: runtime.adapterId,
        adapterContractVersion: runtime.contractVersion,
      },
      storage: {
        state: storage.state,
        path: storage.path,
        lastCheckedAt: storage.lastCheckedAt,
      },
      sessions: { active: sessions },
      latency: services.latency.summary(),
    };
  });
}
