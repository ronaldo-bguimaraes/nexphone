import type { Logger } from "pino";

export type Component =
  | "deploy"
  | "gateway"
  | "runtime"
  | "storage"
  | "auth"
  | "remote"
  | "client";

export interface OperationalEvent {
  component: Component;
  event: string;
  message: string;
  correlationId?: string;
  details?: Record<string, string | number | boolean>;
}

export const ALLOWED_DETAIL_KEYS = new Set([
  "adapter",
  "packageId",
  "state",
  "health",
  "code",
  "reason",
  "clientIp",
  "sessionId",
  "durationMs",
  "attempts",
  "errorCode",
  "path",
  "protocolVersion",
]);

export function logEvent(logger: Logger, event: OperationalEvent): void {
  const details: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(event.details ?? {})) {
    if (ALLOWED_DETAIL_KEYS.has(key)) {
      details[key] = value;
    }
  }
  logger.info(
    {
      component: event.component,
      event: event.event,
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      ...details,
    },
    event.message,
  );
}

export function logError(logger: Logger, event: OperationalEvent, error: unknown): void {
  logger.error(
    {
      component: event.component,
      event: event.event,
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      err: error instanceof Error ? { name: error.name, message: error.message } : error,
    },
    event.message,
  );
}
