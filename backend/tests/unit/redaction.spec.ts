import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/observability/logger.js";
import { logEvent } from "../../src/observability/events.js";

function capture(): { lines: string[]; stream: { write(line: string): void } } {
  const lines: string[] = [];
  return { lines, stream: { write: (line: string) => void lines.push(line) } };
}

describe("operational event redaction", () => {
  it("drops non-allow-listed detail keys", () => {
    const { lines, stream } = capture();
    logEvent(createLogger("info", stream), {
      component: "auth",
      event: "pairing.failed",
      message: "Pairing failed",
      details: {
        sessionId: "s1",
        token: "should-not-appear",
        code: "should-not-appear",
        screen: "should-not-appear",
      } as never,
    });
    const output = lines.join("\n");
    expect(output).toContain("s1");
    expect(output).not.toContain("should-not-appear");
  });

  it("includes correlation identifiers", () => {
    const { lines, stream } = capture();
    logEvent(createLogger("info", stream), {
      component: "runtime",
      event: "runtime.start_failed",
      message: "Start failed",
      correlationId: "corr-1",
    });
    expect(lines.join("\n")).toContain("corr-1");
  });
});
