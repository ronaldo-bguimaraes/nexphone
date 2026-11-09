import { createHash, randomBytes } from "node:crypto";
import type { AuthConfig } from "../config/schema.js";
import type { SessionRecord, StateStore } from "../storage/db.js";

export class SessionBusyError extends Error {
  override readonly name = "SessionBusyError";
}

export interface IssuedSession {
  token: string;
  session: SessionRecord;
}

export interface SessionServiceOptions {
  clock?: () => number;
}

export class SessionService {
  private readonly clock: () => number;
  private readonly revokeListeners = new Set<(sessionId: string) => void>();

  constructor(
    private readonly store: StateStore,
    private readonly config: AuthConfig,
    options: SessionServiceOptions = {},
  ) {
    this.clock = options.clock ?? Date.now;
  }

  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async issue(clientIp: string, userAgent: string): Promise<IssuedSession> {
    const now = this.clock();
    if (
      this.store.activeSessionCount(now, this.config.sessionIdleTtlSeconds * 1000) > 0
    ) {
      throw new SessionBusyError("A session is already active");
    }
    const token = randomBytes(32).toString("base64url");
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      tokenHash: this.hash(token),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + this.config.sessionAbsoluteTtlSeconds * 1000,
      revokedAt: null,
      clientIp,
      userAgent: userAgent.slice(0, 200),
      state: "active",
    };
    this.store.createSession(session);
    return { token, session };
  }

  async validate(token: string): Promise<SessionRecord | null> {
    if (!token) {
      return null;
    }
    const now = this.clock();
    const session = this.store.findSessionByTokenHash(this.hash(token));
    if (!session) {
      return null;
    }
    if (session.revokedAt !== null) {
      return null;
    }
    if (session.expiresAt <= now) {
      this.store.setSessionState(session.id, "expired");
      return null;
    }
    if (now - session.lastSeenAt > this.config.sessionIdleTtlSeconds * 1000) {
      this.store.setSessionState(session.id, "expired");
      return null;
    }
    this.store.touchSession(session.id, now);
    return { ...session, lastSeenAt: now };
  }

  async revoke(sessionId: string): Promise<boolean> {
    const now = this.clock();
    const changed = this.store.revokeSession(sessionId, now);
    if (changed) {
      for (const listener of this.revokeListeners) {
        listener(sessionId);
      }
    }
    return changed;
  }

  async revokeByToken(token: string): Promise<boolean> {
    const session = this.store.findSessionByTokenHash(this.hash(token));
    return session ? this.revoke(session.id) : false;
  }

  async list(): Promise<SessionRecord[]> {
    return this.store.listSessions();
  }

  async activeCount(): Promise<number> {
    return this.store.activeSessionCount(
      this.clock(),
      this.config.sessionIdleTtlSeconds * 1000,
    );
  }

  onRevoke(listener: (sessionId: string) => void): () => void {
    this.revokeListeners.add(listener);
    return () => this.revokeListeners.delete(listener);
  }
}
