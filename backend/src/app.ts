import { existsSync } from "node:fs";
import { join } from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import websocket from "@fastify/websocket";
import { AdapterError } from "./runtime/errors.js";
import { registerAppRoutes } from "./api/apps.js";
import { registerHealthRoutes } from "./api/health.js";
import { registerPairingRoutes } from "./api/pairing.js";
import { registerRuntimeRoutes } from "./api/runtime.js";
import { registerStatusRoutes } from "./api/status.js";
import { registerStreamRoutes } from "./api/stream.js";
import type { Services } from "./api/services.js";

export interface BuildAppOptions {
  services: Services;
  clientDistPath?: string;
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const { services } = options;
  // Request logging goes through `services.logger` in the route handlers; the
  // Fastify instance keeps a no-op logger so its type stays generic.
  const app = Fastify({
    logger: false,
    trustProxy: false,
    bodyLimit: 2 * 1024 * 1024,
  });

  await app.register(websocket, {
    options: { maxPayload: 8 * 1024 * 1024 },
  });
  await app.register(multipart, {
    limits: { fileSize: 512 * 1024 * 1024, files: 1 },
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AdapterError) {
      const status =
        error.code === "NOT_SUPPORTED"
          ? 409
          : error.code === "INPUT_REJECTED"
            ? 400
            : 500;
      void reply.code(status).send({
        error: {
          code: error.code.toLowerCase(),
          message: error.message,
          remediation: error.toNormalized().remediation,
          correlationId: request.id,
        },
      });
      return;
    }
    const fastifyError = error as { statusCode?: number; message: string };
    const statusCode = fastifyError.statusCode ?? 500;
    void reply.code(statusCode).send({
      error: {
        code: "internal_error",
        message: statusCode === 500 ? "Internal server error." : fastifyError.message,
        remediation: "Check the host logs for details.",
        correlationId: request.id,
      },
    });
  });

  registerHealthRoutes(app, services);
  registerStatusRoutes(app, services);
  registerPairingRoutes(app, services);
  registerRuntimeRoutes(app, services);
  registerAppRoutes(app, services);
  registerStreamRoutes(app, services);

  const clientDist = options.clientDistPath ?? join(process.cwd(), "client", "dist");
  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, { root: clientDist, wildcard: false });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === "GET" && !request.url.startsWith("/api") && !request.url.startsWith("/ws")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({
        error: { code: "not_found", message: "Not found" },
      });
    });
  }

  return app;
}
