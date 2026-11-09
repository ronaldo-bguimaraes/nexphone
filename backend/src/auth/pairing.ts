import { createHash } from "node:crypto";
import type { AuthConfig } from "../config/schema.js";
import { generatePairingCode } from "./pepper.js";
import type { PairingRecord, StateStore } from "../storage/db.js";

export interface PairingIssue {
  code: string;
  expiresAt: Date;
}

export type PairingResult =
  | { ok: true; pairingId: string }
  | { ok: false; reason: "invalid" | "expired" | "consumed" | "rate_limited" };

export interface PairingServiceOptions {
  clock?: () => number;
  pepper: Buffer;
}

export class PairingService {
  private readonly clock: () => number;
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly store: StateStore,
    private readonly config: AuthConfig,
    private readonly options: PairingServiceOptions,
  ) {
    this.clock = options.clock ?? Date.now;
  }

  private hash(code: string): string {
    return createHash("sha256").update(this.options.pepper).update(code).digest("hex");
  }

  async issue(sourceIp: string): Promise<PairingIssue> {
    const now = this.clock();
    const code = generatePairingCode();
    const expiresAt = now + this.config.pairingTtlSeconds * 1000;
    this.store.createPairing({
      id: crypto.randomUUID(),
      codeHash: this.hash(code),
      createdAt: now,
      expiresAt,
      consumedAt: null,
      attempts: 0,
      sourceIp,
    });
    return { code, expiresAt: new Date(expiresAt) };
  }

  /**
   * Validates a pairing code and consumes it on success. Rate limiting is per
   * source and never reveals whether the code existed.
   */
  async verify(code: string, sourceIp: string): Promise<PairingResult> {
    if (!/^[0-9]{8}$/.test(code)) {
      return { ok: false, reason: "invalid" };
    }

    const now = this.clock();
    if (!this.allowAttempt(sourceIp, now)) {
      return { ok: false, reason: "rate_limited" };
    }

    const record = this.store.findPairingByHash(this.hash(code));
    if (!record) {
      return { ok: false, reason: "invalid" };
    }
    this.store.incrementPairingAttempts(record.id);

    if (record.consumedAt !== null) {
      return { ok: false, reason: "consumed" };
    }
    if (record.expiresAt <= now) {
      return { ok: false, reason: "expired" };
    }

    this.store.consumePairing(record.id, now);
    return { ok: true, pairingId: record.id };
  }

  async cleanup(): Promise<void> {
    this.store.deleteExpiredPairings(this.clock());
  }

  private allowAttempt(sourceIp: string, now: number): boolean {
    const windowStart = now - 60_000;
    const recent = (this.attempts.get(sourceIp) ?? []).filter((time) => time > windowStart);
    if (recent.length >= this.config.maxPairingAttemptsPerMinute) {
      this.attempts.set(sourceIp, recent);
      return false;
    }
    recent.push(now);
    this.attempts.set(sourceIp, recent);
    return true;
  }
}

export type { PairingRecord };
