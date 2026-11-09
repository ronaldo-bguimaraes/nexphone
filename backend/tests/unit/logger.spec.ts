import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/observability/logger.js";

function capture(): { lines: string[]; stream: { write(line: string): void } } {
  const lines: string[] = [];
  return { lines, stream: { write: (line: string) => void lines.push(line) } };
}

describe("logger redaction", () => {
  it("redacts top-level and nested secrets", () => {
    const { lines, stream } = capture();
    const logger = createLogger("info", stream);
    logger.info({ token: "super-secret", nested: { code: "12345678" } }, "test");
    const output = lines.join("\n");
    expect(output).not.toContain("super-secret");
    expect(output).not.toContain("12345678");
    expect(output).toContain("[redacted]");
  });

  it("never logs pairing codes or session tokens from event details", () => {
    const { lines, stream } = capture();
    const logger = createLogger("info", stream);
    logger.info({ token: "abc", code: "87654321" }, "pairing");
    const output = lines.join("\n");
    expect(output).not.toContain("abc");
    expect(output).not.toContain("87654321");
  });
});
