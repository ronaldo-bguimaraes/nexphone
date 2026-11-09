import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function loadOperatorToken(statePath: string): Promise<string> {
  const path = join(statePath, "operator-token");
  try {
    const token = (await readFile(path, "utf8")).trim();
    if (token.length >= 32) {
      return token;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
  const token = randomBytes(32).toString("base64url");
  await writeFile(path, token, { mode: 0o600 });
  return token;
}
