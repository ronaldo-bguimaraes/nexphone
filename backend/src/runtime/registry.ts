import { AdapterError } from "./errors.js";
import type { NexPhoneConfig } from "../config/schema.js";
import type { RuntimeAdapter } from "./contract.js";

export type AdapterFactory = (config: NexPhoneConfig) => RuntimeAdapter;

const factories = new Map<string, AdapterFactory>();

export function registerAdapter(id: string, factory: AdapterFactory): void {
  factories.set(id, factory);
}

export function createAdapter(config: NexPhoneConfig): RuntimeAdapter {
  const id = config.runtime.adapter;
  const factory = factories.get(id);
  if (!factory) {
    throw new AdapterError(
      "NOT_SUPPORTED",
      `Runtime adapter "${id}" is not registered`,
      `Registered adapters: ${[...factories.keys()].join(", ") || "none"}`,
    );
  }
  return factory(config);
}

export function registeredAdapters(): string[] {
  return [...factories.keys()].sort();
}

export function resetRegistry(): void {
  factories.clear();
}
