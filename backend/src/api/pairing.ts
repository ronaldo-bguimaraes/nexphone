import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { SessionBusyError } from "../auth/sessions.js";
import type { Services } from "./services.js";

const pairSchema = z
  .object({
    code: z.string().regex(/^[0-9]{8}$/),
    clientName: z.string().max(64).optional(),
  })
  .strict();

export function registerPairingRoutes(app: FastifyInstance, services: Services): void {
  app.post("/api/pair", async (request, reply) => {
    const parsed = pairSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: {
          code: "invalid_request",
          message: "A pairing code and optional client name are required.",
          remediation: "Enter the 8-digit code shown on the host.",
        },
      });
    }

    const result = await services.pairing.verify(parsed.data.code, request.ip);
    if (!result.ok) {
      if (result.reason === "rate_limited") {
        return reply
          .code(429)
          .header("retry-after", "60")
          .send({
            error: {
              code: "rate_limited",
              message: "Too many pairing attempts. Try again later.",
              remediation: "Wait a minute and request a new code on the host.",
            },
          });
      }
      return reply.code(401).send({
        error: {
          code: "invalid_pairing",
          message: "The pairing code is invalid or no longer usable.",
          remediation: "Request a new code on the host and try again.",
        },
      });
    }

    try {
      const issued = await services.sessions.issue(request.ip, parsed.data.clientName ?? "phone");
      return reply.send({
        token: issued.token,
        sessionId: issued.session.id,
        expiresAt: new Date(issued.session.expiresAt).toISOString(),
      });
    } catch (error) {
      if (error instanceof SessionBusyError) {
        return reply.code(409).send({
          error: {
            code: "session_busy",
            message: "Another session is already active.",
            remediation: "Revoke the active session on the host before pairing again.",
          },
        });
      }
      throw error;
    }
  });

  app.post(
    "/api/pair/code",
    { preHandler: services.requireOperator },
    async (request) => {
      const issued = await services.pairing.issue(request.ip);
      return { code: issued.code, expiresAt: issued.expiresAt.toISOString() };
    },
  );

  app.delete("/api/session", { preHandler: services.authenticate }, async (request, reply) => {
    const auth = request.nexphoneAuth;
    if (auth?.kind === "session" && auth.sessionId) {
      await services.sessions.revoke(auth.sessionId);
    }
    return reply.code(204).send();
  });

  app.delete(
    "/api/sessions/:id",
    { preHandler: services.requireOperator },
    async (request, reply) => {
      const id = (request.params as { id: string }).id;
      const revoked = await services.sessions.revoke(id);
      if (!revoked) {
        return reply.code(404).send({
          error: { code: "session_not_found", message: "No active session with that id." },
        });
      }
      return reply.code(204).send();
    },
  );

  app.get("/api/sessions", { preHandler: services.authenticate }, async () => {
    const sessions = await services.sessions.list();
    return sessions.map((session) => ({
      id: session.id,
      state: session.state,
      createdAt: new Date(session.createdAt).toISOString(),
      lastSeenAt: new Date(session.lastSeenAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString(),
      clientIp: session.clientIp,
      userAgent: session.userAgent,
    }));
  });
}
