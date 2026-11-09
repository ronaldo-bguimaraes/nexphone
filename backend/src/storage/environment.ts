import { access, lstat, mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import type { StorageState, StorageStatus } from "../runtime/contract.js";

const RUNNING_MARKER = ".nexphone-running";
const CLEAN_MARKER = ".nexphone-clean";

export interface InspectOptions {
  clock?: () => number;
}

export async function inspectStore(
  path: string,
  options: InspectOptions = {},
): Promise<StorageStatus> {
  const now = (options.clock ?? Date.now)();
  const lastCheckedAt = new Date(now).toISOString();
  const state = async (value: StorageState, message?: string): Promise<StorageStatus> => ({
    path,
    state: value,
    lastCheckedAt,
    ...(message ? { message } : {}),
  });

  let info;
  try {
    info = await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return state("missing", "The configured persistent store does not exist.");
    }
    return state("unsafe", (error as Error).message);
  }

  if (info.isSymbolicLink()) {
    return state("unsafe", "The persistent store must not be a symbolic link.");
  }
  if (!info.isDirectory()) {
    return state("unsafe", "The persistent store must be a directory.");
  }

  try {
    await access(path, constants.W_OK);
  } catch {
    return state("read-only", "The persistent store is not writable by the service user.");
  }

  try {
    const entries = await readdir(path);
    if (entries.includes(RUNNING_MARKER) && !entries.includes(CLEAN_MARKER)) {
      return state(
        "inconsistent",
        "The previous runtime did not stop cleanly. Inspect the data before starting.",
      );
    }
  } catch (error) {
    return state("unsafe", (error as Error).message);
  }

  const size = await directorySize(path).catch(() => undefined);
  return {
    path,
    state: "ok",
    lastCheckedAt,
    ...(size !== undefined ? { sizeBytes: size } : {}),
  };
}

export async function ensureStore(path: string): Promise<StorageStatus> {
  const existing = await inspectStore(path);
  if (existing.state === "missing") {
    await mkdir(path, { recursive: true, mode: 0o700 });
    return inspectStore(path);
  }
  return existing;
}

export async function markRunning(path: string): Promise<void> {
  await writeFile(join(path, RUNNING_MARKER), new Date().toISOString(), { mode: 0o600 });
  await rm(join(path, CLEAN_MARKER), { force: true });
}

export async function markStopped(path: string): Promise<void> {
  const now = new Date().toISOString();
  await writeFile(join(path, CLEAN_MARKER), now, { mode: 0o600 });
  await rm(join(path, RUNNING_MARKER), { force: true });
}

export async function rotateFile(from: string, to: string): Promise<void> {
  try {
    await rename(from, to);
  } catch {
    // best effort
  }
}

async function directorySize(path: string): Promise<number | undefined> {
  const info = await stat(path);
  if (!info.isDirectory()) {
    return info.size;
  }
  const entries = await readdir(path, { withFileTypes: true });
  let total = 0;
  for (const entry of entries.slice(0, 50)) {
    if (entry.isFile()) {
      const child = await stat(join(path, entry.name)).catch(() => undefined);
      total += child?.size ?? 0;
    }
  }
  return total;
}
