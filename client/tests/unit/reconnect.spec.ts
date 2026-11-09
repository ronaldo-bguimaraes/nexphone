import { describe, expect, it, vi } from "vitest";
import { createBackoff } from "../../src/session/reconnect.js";

describe("reconnect backoff", () => {
  it("grows and is capped", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const backoff = createBackoff(100, 1000);
    expect(backoff.next()).toBe(100);
    expect(backoff.next()).toBe(200);
    expect(backoff.next()).toBe(400);
    expect(backoff.next()).toBe(800);
    expect(backoff.next()).toBe(1000);
    backoff.reset();
    expect(backoff.next()).toBe(100);
    vi.restoreAllMocks();
  });
});
