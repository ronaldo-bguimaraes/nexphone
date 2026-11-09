import { describe, expect, it } from "vitest";
import { PairingService } from "../../src/auth/pairing.js";
import { SessionBusyError, SessionService } from "../../src/auth/sessions.js";
import type { AuthConfig } from "../../src/config/schema.js";
import { StateStore } from "../../src/storage/db.js";

const authConfig: AuthConfig = {
  pairingTtlSeconds: 300,
  sessionIdleTtlSeconds: 43200,
  sessionAbsoluteTtlSeconds: 86400,
  maxPairingAttemptsPerMinute: 5,
};

function services(clock: () => number, maxAttempts = 5) {
  const store = new StateStore(":memory:");
  const config = { ...authConfig, maxPairingAttemptsPerMinute: maxAttempts };
  return {
    store,
    pairing: new PairingService(store, config, { clock, pepper: Buffer.from("pepper") }),
    sessions: new SessionService(store, config, { clock }),
  };
}

describe("pairing", () => {
  it("verifies a code once", async () => {
    const { pairing } = services(() => 1000);
    const issued = await pairing.issue("127.0.0.1");
    expect(issued.code).toMatch(/^[0-9]{8}$/);
    expect(await pairing.verify(issued.code, "127.0.0.1")).toEqual({ ok: true, pairingId: expect.any(String) });
    expect(await pairing.verify(issued.code, "127.0.0.1")).toEqual({ ok: false, reason: "consumed" });
  });

  it("rejects expired codes", async () => {
    let now = 1000;
    const { pairing } = services(() => now);
    const issued = await pairing.issue("127.0.0.1");
    now += 301_000;
    expect(await pairing.verify(issued.code, "127.0.0.1")).toEqual({ ok: false, reason: "expired" });
  });

  it("rate limits per source", async () => {
    const { pairing } = services(() => 1000, 2);
    await pairing.issue("127.0.0.1");
    await pairing.verify("00000000", "127.0.0.1");
    await pairing.verify("00000000", "127.0.0.1");
    expect(await pairing.verify("00000000", "127.0.0.1")).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("does not reveal whether a code exists", async () => {
    const { pairing } = services(() => 1000);
    expect(await pairing.verify("12345678", "10.0.0.1")).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("sessions", () => {
  it("issues, validates and revokes a token", async () => {
    const { sessions } = services(() => 1000);
    const issued = await sessions.issue("127.0.0.1", "vitest");
    expect(await sessions.validate(issued.token)).not.toBeNull();
    expect(await sessions.revoke(issued.session.id)).toBe(true);
    expect(await sessions.validate(issued.token)).toBeNull();
  });

  it("rejects a second active session", async () => {
    const { sessions } = services(() => 1000);
    await sessions.issue("127.0.0.1", "one");
    await expect(sessions.issue("127.0.0.1", "two")).rejects.toBeInstanceOf(SessionBusyError);
  });

  it("expires idle sessions", async () => {
    let now = 1000;
    const { sessions } = services(() => now);
    const issued = await sessions.issue("127.0.0.1", "test");
    now += 43_201_000;
    expect(await sessions.validate(issued.token)).toBeNull();
  });

  it("notifies revocation listeners", async () => {
    const { sessions } = services(() => 1000);
    const issued = await sessions.issue("127.0.0.1", "test");
    let revoked: string | null = null;
    sessions.onRevoke((id) => {
      revoked = id;
    });
    await sessions.revoke(issued.session.id);
    expect(revoked).toBe(issued.session.id);
  });
});
