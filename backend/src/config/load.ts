import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { ZodError } from "zod";
import { configSchema, type NexPhoneConfig } from "./schema.js";

export class ConfigError extends Error {
  override readonly name = "ConfigError";
}

export interface LoadConfigOptions {
  path?: string;
  env?: NodeJS.ProcessEnv;
}

/**
 * Loads and validates YAML configuration. Environment variables may override
 * deployment paths and the listening port, but never the runtime image digest.
 */
export async function loadConfig(options: LoadConfigOptions = {}): Promise<NexPhoneConfig> {
  const env = options.env ?? process.env;
  const path = options.path ?? env.NEXPHONE_CONFIG ?? "config/nexphone.yaml";

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    throw new ConfigError(`Cannot read configuration file at ${path}: ${(error as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = parse(raw);
  } catch (error) {
    throw new ConfigError(`Invalid YAML in ${path}: ${(error as Error).message}`);
  }

  if (parsed && typeof parsed === "object") {
    const candidate = parsed as Record<string, any>;
    if (env.NEXPHONE_DATA_PATH) {
      candidate.storage = { ...candidate.storage, dataPath: env.NEXPHONE_DATA_PATH };
    }
    if (env.NEXPHONE_STATE_PATH) {
      candidate.storage = { ...candidate.storage, statePath: env.NEXPHONE_STATE_PATH };
    }
    if (env.NEXPHONE_PORT) {
      candidate.host = { ...candidate.host, port: Number(env.NEXPHONE_PORT) };
    }
  }

  try {
    return configSchema.parse(parsed);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ");
      throw new ConfigError(`Invalid configuration in ${path}: ${details}`);
    }
    throw error;
  }
}

export function parseConfig(value: unknown): NexPhoneConfig {
  return configSchema.parse(value);
}
