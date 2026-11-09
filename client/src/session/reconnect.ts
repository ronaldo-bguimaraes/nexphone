export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

export interface Backoff {
  next(): number;
  reset(): void;
}

export function createBackoff(baseMs = 500, maxMs = 10_000): Backoff {
  let attempt = 0;
  return {
    next() {
      const ceiling = Math.min(maxMs, baseMs * 2 ** attempt);
      attempt += 1;
      const jitter = Math.random() * ceiling * 0.25;
      return Math.min(maxMs, ceiling + jitter);
    },
    reset() {
      attempt = 0;
    },
  };
}
