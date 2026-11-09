import { mkdir } from "node:fs/promises";
import { loadConfig } from "./config/load.js";
import { createLogger } from "./observability/logger.js";
import { StateStore } from "./storage/db.js";
import { getOrCreatePepper } from "./auth/pepper.js";
import { PairingService } from "./auth/pairing.js";
import { SessionService } from "./auth/sessions.js";
import { loadOperatorToken } from "./auth/operator.js";
import { createAuthenticate, createOperatorOnly } from "./api/middleware.js";
import { LatencyTracker } from "./remote/protocol.js";
import { createAdapter, registerAdapter } from "./runtime/registry.js";
import { RedroidAdapter } from "./runtime/redroid/adapter.js";
import { FakeAdapter } from "./runtime/fake/adapter.js";
import { MockAdapter } from "./runtime/mock/adapter.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const config = await loadConfig();
  const logger = createLogger(config.logging.level);

  await mkdir(config.storage.statePath, { recursive: true, mode: 0o700 });

  const store = new StateStore(`${config.storage.statePath}/nexphone.db`);
  const pepper = await getOrCreatePepper(config.storage.statePath);
  const operatorToken = await loadOperatorToken(config.storage.statePath);

  registerAdapter("redroid", (value) => new RedroidAdapter(value));
  if (process.env.NEXPHONE_ENABLE_TEST_ADAPTERS === "1") {
    registerAdapter("fake", () => new FakeAdapter());
    registerAdapter("mock", () => new MockAdapter());
    logger.warn({ event: "test_adapters_enabled" }, "Test adapters are registered");
  }

  const adapter = createAdapter(config);
  const pairing = new PairingService(store, config.auth, { pepper });
  const sessions = new SessionService(store, config.auth);
  const authenticate = createAuthenticate({ sessions, operatorToken });
  const requireOperator = createOperatorOnly({ sessions, operatorToken });

  const services = {
    config,
    logger,
    adapter,
    store,
    pairing,
    sessions,
    operatorToken,
    latency: new LatencyTracker(),
    authenticate,
    requireOperator,
  };

  const app = await buildApp({ services });
  const host = config.host.binding === "loopback" ? "127.0.0.1" : "0.0.0.0";
  const port = Number(process.env.NEXPHONE_INTERNAL_PORT ?? 8080);

  await app.listen({ host, port });
  logger.info({ host, port }, "NexPhone gateway listening");

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down gateway");
    await app.close().catch(() => undefined);
    store.close();
    process.exit(0);
  };
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`NexPhone failed to start: ${message}`);
  process.exit(1);
});
