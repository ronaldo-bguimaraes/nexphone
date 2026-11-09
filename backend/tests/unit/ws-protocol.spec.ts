import { describe, expect, it } from "vitest";
import { AdapterError } from "../../src/runtime/errors.js";
import {
  LatencyTracker,
  assertInBounds,
  decodeVideoPacket,
  encodeVideoPacket,
  parseClientMessage,
} from "../../src/remote/protocol.js";

describe("websocket protocol", () => {
  it("parses an auth message", () => {
    expect(parseClientMessage(JSON.stringify({ type: "auth", token: "abc" }))).toMatchObject({
      type: "auth",
      protocolVersion: "1.0",
    });
  });

  it("parses input and rejects unknown fields", () => {
    expect(
      parseClientMessage(JSON.stringify({ type: "input", event: { type: "tap", x: 1, y: 2 } })),
    ).toMatchObject({ type: "input" });
    expect(() =>
      parseClientMessage(JSON.stringify({ type: "input", event: { type: "tap", x: 1, y: 2, z: 3 } })),
    ).toThrow(AdapterError);
  });

  it("rejects malformed JSON and unknown messages", () => {
    expect(() => parseClientMessage("{")).toThrow(AdapterError);
    expect(() => parseClientMessage(JSON.stringify({ type: "explode" }))).toThrow(AdapterError);
  });

  it("enforces coordinate bounds", () => {
    expect(() =>
      assertInBounds({ type: "tap", x: 800, y: 10 }, 720, 1280),
    ).toThrow(/outside the display/);
    expect(() => assertInBounds({ type: "tap", x: 100, y: 100 }, 720, 1280)).not.toThrow();
  });

  it("enforces text length", () => {
    expect(() =>
      parseClientMessage(
        JSON.stringify({ type: "input", event: { type: "text", text: "x".repeat(1025) } }),
      ),
    ).toThrow(AdapterError);
  });

  it("frames video configuration and data packets", () => {
    const config = encodeVideoPacket(true, new Uint8Array([1, 2]));
    const data = encodeVideoPacket(false, new Uint8Array([3]));
    expect(config[0]).toBe(0x01);
    expect(data[0]).toBe(0x02);
    expect(decodeVideoPacket(config)).toEqual({ configuration: true, data: new Uint8Array([1, 2]) });
    expect(decodeVideoPacket(data)).toEqual({ configuration: false, data: new Uint8Array([3]) });
  });

  it("summarizes latency samples", () => {
    const tracker = new LatencyTracker();
    expect(tracker.summary()).toEqual({ samples: 0, p50Ms: null, p95Ms: null });
    for (const value of [10, 20, 30, 40]) {
      tracker.record(value);
    }
    expect(tracker.summary().samples).toBe(4);
    expect(tracker.summary().p50Ms).toBe(30);
  });
});
