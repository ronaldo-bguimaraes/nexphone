import { describe, expect, it } from "vitest";
import type { InputSink } from "../../src/runtime/contract.js";
import { forwardInput } from "../../src/remote/input.js";

function sink(records: string[]): InputSink {
  return {
    async tap(x, y) {
      records.push(`tap:${x},${y}`);
    },
    async swipe(x1, y1, x2, y2, durationMs) {
      records.push(`swipe:${x1},${y1},${x2},${y2}:${durationMs}`);
    },
    async scroll(x, y, dx, dy) {
      records.push(`scroll:${x},${y},${dx},${dy}`);
    },
    async key(code, action) {
      records.push(`key:${code}:${action}`);
    },
    async text(value) {
      records.push(`text:${value}`);
    },
    async close() {
      records.push("close");
    },
  };
}

describe("input forwarding", () => {
  it("forwards every input type", async () => {
    const records: string[] = [];
    const input = sink(records);
    await forwardInput({ type: "tap", x: 10, y: 20 }, input, 720, 1280);
    await forwardInput({ type: "swipe", x: 1, y: 2, x2: 3, y2: 4, durationMs: 100 }, input, 720, 1280);
    await forwardInput({ type: "scroll", x: 5, y: 6, deltaX: 0, deltaY: 1 }, input, 720, 1280);
    await forwardInput({ type: "key", keyCode: 4, action: "down" }, input, 720, 1280);
    await forwardInput({ type: "text", text: "hello" }, input, 720, 1280);
    expect(records).toEqual([
      "tap:10,20",
      "swipe:1,2,3,4:100",
      "scroll:5,6,0,1",
      "key:4:down",
      "text:hello",
    ]);
  });

  it("rejects out-of-bounds input before forwarding", async () => {
    const records: string[] = [];
    await expect(
      forwardInput({ type: "tap", x: -1, y: 0 }, sink(records), 720, 1280),
    ).rejects.toThrow(/outside the display/);
    expect(records).toEqual([]);
  });

  it("rejects zero-delta scroll", async () => {
    await expect(
      forwardInput({ type: "scroll", x: 0, y: 0, deltaX: 0, deltaY: 0 }, sink([]), 720, 1280),
    ).rejects.toThrow(/non-zero delta/);
  });
});
