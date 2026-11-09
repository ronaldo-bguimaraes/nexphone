import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionService } from "../auth/sessions.js";

export interface AuthContext {
  kind: "session" | "operator";
  sessionId?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    nexphoneAuth?: AuthContext;
  }
}

export interface AuthHooksOptions {
  sessions: SessionService;
  operatorToken: string;
}

export function createAuthenticate(options: AuthHooksOptions) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const header = request.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      const session = await options.sessions.validate(header.slice("Bearer ".length));
      if (session) {
        request.nexphoneAuth = { kind: "session", sessionId: session.id };
        return;
      }
    }

    const operator = request.headers["x-operator-token"];
    if (typeof operator === "string" && safeEqual(operator, options.operatorToken)) {
      request.nexphoneAuth = { kind: "operator" };
      return;
    }

    await reply.code(401).send({
      error: {
        code: "unauthorized",
        message: "A valid session or operator token is required.",
        remediation: "Pair the device again or use the operator token from the host.",
      },
    });
  };
}

export function createOperatorOnly(options: AuthHooksOptions) {
  return async function operatorOnly(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const operator = request.headers["x-operator-token"];
    if (typeof operator === "string" && safeEqual(operator, options.operatorToken)) {
      request.nexphoneAuth = { kind: "operator" };
      return;
    }
    await reply.code(401).send({
      error: {
        code: "operator_required",
        message: "This operation is only available to the host operator.",
        remediation: "Run the command on the host with access to the operator token.",
      },
    });
  };
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
