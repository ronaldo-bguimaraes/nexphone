import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncType } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// `node:sqlite` is resolved at runtime so test runners that pre-bundle
// dependencies do not try to rewrite the built-in module specifier.
const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: typeof DatabaseSyncType;
};

export interface PairingRecord {
  id: string;
  codeHash: string;
  createdAt: number;
  expiresAt: number;
  consumedAt: number | null;
  attempts: number;
  sourceIp: string;
}

export type SessionState = "active" | "expired" | "revoked" | "closed";

export interface SessionRecord {
  id: string;
  tokenHash: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
  revokedAt: number | null;
  clientIp: string;
  userAgent: string;
  state: SessionState;
}

interface PairingRow {
  id: string;
  code_hash: string;
  created_at: number;
  expires_at: number;
  consumed_at: number | null;
  attempts: number;
  source_ip: string;
}

interface SessionRow {
  id: string;
  token_hash: string;
  created_at: number;
  last_seen_at: number;
  expires_at: number;
  revoked_at: number | null;
  client_ip: string;
  user_agent: string;
  state: string;
}

const MIGRATIONS = `
CREATE TABLE IF NOT EXISTS pairings (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  source_ip TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pairings_expires ON pairings(expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  client_ip TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  state TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_state ON sessions(state);
`;

export class StateStore {
  private readonly db: DatabaseSyncType;

  constructor(path: string) {
    if (path !== ":memory:") {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    }
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.db.exec(MIGRATIONS);
  }

  close(): void {
    this.db.close();
  }

  createPairing(record: PairingRecord): void {
    this.db
      .prepare(
        `INSERT INTO pairings (id, code_hash, created_at, expires_at, consumed_at, attempts, source_ip)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        record.id,
        record.codeHash,
        record.createdAt,
        record.expiresAt,
        record.consumedAt,
        record.attempts,
        record.sourceIp,
      );
  }

  findPairingByHash(codeHash: string): PairingRecord | null {
    const row = this.db.prepare("SELECT * FROM pairings WHERE code_hash = ?").get(codeHash) as
      | PairingRow
      | undefined;
    return row ? mapPairing(row) : null;
  }

  incrementPairingAttempts(id: string): void {
    this.db.prepare("UPDATE pairings SET attempts = attempts + 1 WHERE id = ?").run(id);
  }

  consumePairing(id: string, when: number): void {
    this.db.prepare("UPDATE pairings SET consumed_at = ? WHERE id = ?").run(when, id);
  }

  deleteExpiredPairings(now: number): void {
    this.db.prepare("DELETE FROM pairings WHERE expires_at < ?").run(now);
  }

  createSession(session: SessionRecord): void {
    this.db
      .prepare(
        `INSERT INTO sessions (id, token_hash, created_at, last_seen_at, expires_at, revoked_at, client_ip, user_agent, state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        session.id,
        session.tokenHash,
        session.createdAt,
        session.lastSeenAt,
        session.expiresAt,
        session.revokedAt,
        session.clientIp,
        session.userAgent,
        session.state,
      );
  }

  findSessionByTokenHash(tokenHash: string): SessionRecord | null {
    const row = this.db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(tokenHash) as
      | SessionRow
      | undefined;
    return row ? mapSession(row) : null;
  }

  findSessionById(id: string): SessionRecord | null {
    const row = this.db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
      | SessionRow
      | undefined;
    return row ? mapSession(row) : null;
  }

  touchSession(id: string, when: number): void {
    this.db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(when, id);
  }

  revokeSession(id: string, when: number): boolean {
    const result = this.db
      .prepare("UPDATE sessions SET revoked_at = ?, state = 'revoked' WHERE id = ? AND revoked_at IS NULL")
      .run(when, id);
    return Number(result.changes) > 0;
  }

  setSessionState(id: string, state: SessionState): void {
    this.db.prepare("UPDATE sessions SET state = ? WHERE id = ?").run(state, id);
  }

  listSessions(): SessionRecord[] {
    const rows = this.db
      .prepare("SELECT * FROM sessions ORDER BY created_at DESC LIMIT 100")
      .all() as unknown as SessionRow[];
    return rows.map(mapSession);
  }

  activeSessionCount(now: number, idleTtlMs = Number.MAX_SAFE_INTEGER): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS count FROM sessions
         WHERE revoked_at IS NULL AND state = 'active' AND expires_at > ? AND last_seen_at > ?`,
      )
      .get(now, now - idleTtlMs) as { count: number } | undefined;
    return Number(row?.count ?? 0);
  }

  deleteExpiredSessions(now: number, idleTtlMs: number): void {
    this.db
      .prepare("DELETE FROM sessions WHERE expires_at < ? OR last_seen_at < ?")
      .run(now, now - idleTtlMs);
  }
}

function mapPairing(row: PairingRow): PairingRecord {
  return {
    id: row.id,
    codeHash: row.code_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    attempts: row.attempts,
    sourceIp: row.source_ip,
  };
}

function mapSession(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    clientIp: row.client_ip,
    userAgent: row.user_agent,
    state: row.state as SessionState,
  };
}
