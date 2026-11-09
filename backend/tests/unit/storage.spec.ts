import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { inspectStore, markRunning, markStopped } from "../../src/storage/environment.js";

const created: string[] = [];

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "nexphone-store-"));
  created.push(dir);
  return dir;
}

afterEach(async () => {
  for (const dir of created.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe("persistent store inspection", () => {
  it("reports a missing directory", async () => {
    const dir = await tempDir();
    expect((await inspectStore(join(dir, "absent"))).state).toBe("missing");
  });

  it("reports a writable directory as ok", async () => {
    const dir = await tempDir();
    expect((await inspectStore(dir)).state).toBe("ok");
  });

  it("reports a read-only directory", async () => {
    const dir = await tempDir();
    await mkdir(join(dir, "readonly"));
    await rm(join(dir, "readonly"), { recursive: true });
    const readonly = join(dir, "readonly");
    await mkdir(readonly, { mode: 0o500 });
    const result = await inspectStore(readonly);
    await rm(readonly, { recursive: true, force: true });
    expect(result.state).toBe("read-only");
  });

  it("reports an unsafe symlink", async () => {
    const dir = await tempDir();
    const target = await tempDir();
    const link = join(dir, "link");
    await symlink(target, link);
    expect((await inspectStore(link)).state).toBe("unsafe");
  });

  it("detects an unclean shutdown marker", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, ".nexphone-running"), "x");
    expect((await inspectStore(dir)).state).toBe("inconsistent");
    await markStopped(dir);
    expect((await inspectStore(dir)).state).toBe("ok");
  });

  it("marks running and stopped", async () => {
    const dir = await tempDir();
    await markRunning(dir);
    expect((await inspectStore(dir)).state).toBe("inconsistent");
    await markStopped(dir);
    expect((await inspectStore(dir)).state).toBe("ok");
  });
});
