import { randomBytes, randomInt } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Returns a persistent 32-byte pepper for pairing-code hashes. The pepper is
 * generated once per state directory and stored with owner-only permissions.
 */
export async function getOrCreatePepper(statePath: string): Promise<Buffer> {
  await mkdir(statePath, { recursive: true, mode: 0o700 });
  const path = join(statePath, "pairing-pepper");
  try {
    const existing = await readFile(path);
    if (existing.length >= 32) {
      return existing;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  const pepper = randomBytes(32);
  await writeFile(path, pepper, { mode: 0o600 });
  return pepper;
}

export function generatePairingCode(): string {
  return randomInt(0, 100_000_000).toString().padStart(8, "0");
}
