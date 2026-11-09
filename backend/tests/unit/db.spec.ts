import { describe, expect, it } from "vitest";
import { StateStore } from "../../src/storage/db.js";

function store(): StateStore {
  return new StateStore(":memory:");
}

describe("state store", () => {
  it("stores and consumes pairings", () => {
    const db = store();
    db.createPairing({
      id: "p1",
      codeHash: "hash",
      createdAt: 1,
      expiresAt: 2,
      consumedAt: null,
      attempts: 0,
      sourceIp: "127.0.0.1",
    });
    expect(db.findPairingByHash("hash")?.id).toBe("p1");
    db.consumePairing("p1", 1);
    expect(db.findPairingByHash("hash")?.consumedAt).toBe(1);
    db.close();
  });

  it("counts only active sessions", () => {
    const db = store();
    const base = {
      tokenHash: "h1",
      createdAt: 0,
      lastSeenAt: 0,
      expiresAt: 1000,
      revokedAt: null,
      clientIp: "127.0.0.1",
      userAgent: "test",
      state: "active" as const,
    };
    db.createSession({ ...base, id: "s1" });
    expect(db.activeSessionCount(1)).toBe(1);
    db.revokeSession("s1", 2);
    expect(db.activeSessionCount(3)).toBe(0);
    db.close();
  });

  it("persists revocation", () => {
    const db = store();
    db.createSession({
      id: "s1",
      tokenHash: "h",
      createdAt: 0,
      lastSeenAt: 0,
      expiresAt: 1000,
      revokedAt: null,
      clientIp: "127.0.0.1",
      userAgent: "test",
      state: "active",
    });
    expect(db.revokeSession("s1", 10)).toBe(true);
    expect(db.revokeSession("s1", 11)).toBe(false);
    expect(db.findSessionById("s1")?.state).toBe("revoked");
    db.close();
  });
});
