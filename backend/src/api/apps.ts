import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance } from "fastify";
import type { Services } from "./services.js";

const MAX_PACKAGE_BYTES = 512 * 1024 * 1024;

export function registerAppRoutes(app: FastifyInstance, services: Services): void {
  app.get("/api/apps", { preHandler: services.authenticate }, async (_request, reply) => {
    const status = await services.adapter.getStatus();
    if (status.state !== "ready") {
      return reply.code(409).send({
        error: {
          code: "runtime_not_ready",
          message: "The Android runtime is not ready.",
          remediation: "Start the runtime and wait for the ready state.",
        },
      });
    }
    return services.adapter.listApps();
  });

  app.post("/api/apps", { preHandler: services.authenticate }, async (request, reply) => {
    const part = await request.file({ limits: { fileSize: MAX_PACKAGE_BYTES } });
    if (!part) {
      return reply.code(400).send({
        error: {
          code: "missing_package",
          message: "No application package was uploaded.",
          remediation: "Upload an APK in the multipart field named 'package'.",
        },
      });
    }

    const uploadDir = join(services.config.storage.statePath, "uploads");
    await mkdir(uploadDir, { recursive: true, mode: 0o700 });
    const artifactPath = join(uploadDir, `${randomUUID()}.apk`);
    try {
      await pipeline(part.file, createWriteStream(artifactPath, { mode: 0o600 }));
      const app = await services.adapter.installApp({ artifactPath });
      return reply.code(201).send(app);
    } finally {
      await rm(artifactPath, { force: true }).catch(() => undefined);
    }
  });

  app.post(
    "/api/apps/:packageId/launch",
    { preHandler: services.authenticate },
    async (request, reply) => {
      const packageId = (request.params as { packageId: string }).packageId;
      await services.adapter.launchApp(packageId);
      return reply.code(202).send({ accepted: true });
    },
  );

  app.post(
    "/api/apps/:packageId/stop",
    { preHandler: services.authenticate },
    async (request, reply) => {
      const packageId = (request.params as { packageId: string }).packageId;
      await services.adapter.stopApp(packageId);
      return reply.code(202).send({ accepted: true });
    },
  );
}
