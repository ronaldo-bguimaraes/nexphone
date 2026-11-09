import type { FastifyReply, FastifyRequest } from "fastify";
import type { Logger } from "pino";
import type { NexPhoneConfig } from "../config/schema.js";
import type { PairingService } from "../auth/pairing.js";
import type { SessionService } from "../auth/sessions.js";
import type { RuntimeAdapter } from "../runtime/contract.js";
import type { LatencyTracker } from "../remote/protocol.js";
import type { StateStore } from "../storage/db.js";

export type PreHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

export interface Services {
  config: NexPhoneConfig;
  logger: Logger;
  adapter: RuntimeAdapter;
  store: StateStore;
  pairing: PairingService;
  sessions: SessionService;
  operatorToken: string;
  latency: LatencyTracker;
  authenticate: PreHandler;
  requireOperator: PreHandler;
}

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    remediation?: string;
    correlationId?: string;
  };
}
