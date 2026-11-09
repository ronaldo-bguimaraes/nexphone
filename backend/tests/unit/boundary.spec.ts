import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = join(process.cwd(), "src");
const ADAPTER_ROOT = join(SOURCE_ROOT, "runtime", "redroid");
const COMPOSITION_ROOT = join(SOURCE_ROOT, "main.ts");

async function files(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const output: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await files(full)));
    } else if (entry.name.endsWith(".ts")) {
      output.push(full);
    }
  }
  return output;
}

describe("adapter boundary", () => {
  it("keeps runtime-specific identifiers inside the adapter", async () => {
    const forbidden = [/redroid/i, /scrcpy/i, /dockerode/i, /\/data\/local\/tmp/i];
    const violations: string[] = [];
    for (const file of await files(SOURCE_ROOT)) {
      if (file.startsWith(ADAPTER_ROOT) || file === COMPOSITION_ROOT) {
        continue;
      }
      const content = await readFile(file, "utf8");
      for (const pattern of forbidden) {
        if (pattern.test(content)) {
          violations.push(`${relative(SOURCE_ROOT, file)} matches ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
