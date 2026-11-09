import type { FastifyInstance } from "fastify";
import type { Services } from "./services.js";

export function registerHealthRoutes(app: FastifyInstance, _services: Services): void {
  app.get("/api/health", async () => ({ status: "ok", version: "0.1.0" }));
}
