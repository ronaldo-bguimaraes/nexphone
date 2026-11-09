import { describe, expect, it } from "vitest";
import { decodeVideoFrame } from "../../src/stream/frames.js";

describe("video frames", () => {
  it("decodes configuration packets", () => {
    const frame = decodeVideoFrame(new Uint8Array([0x01, 1, 2, 3]).buffer);
    expect(frame.packet.type).toBe("configuration");
    expect(frame.keyframe).toBe(true);
  });

  it("decodes data packets", () => {
    const frame = decodeVideoFrame(new Uint8Array([0x02, 9, 8]).buffer);
    expect(frame.packet.type).toBe("data");
    expect(frame.keyframe).toBe(false);
  });

  it("rejects unknown headers", () => {
    expect(() => decodeVideoFrame(new Uint8Array([0x09]).buffer)).toThrow(/Unknown/);
    expect(() => decodeVideoFrame(new Uint8Array([]).buffer)).toThrow(/Empty/);
  });
});
