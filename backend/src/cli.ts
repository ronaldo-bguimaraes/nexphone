#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { Command } from "commander";

const program = new Command();

function baseUrl(): string {
  return process.env.NEXPHONE_URL ?? "http://127.0.0.1:8080";
}

function statePath(): string {
  return process.env.NEXPHONE_STATE_PATH ?? "data/state";
}

async function operatorToken(): Promise<string> {
  if (process.env.NEXPHONE_OPERATOR_TOKEN) {
    return process.env.NEXPHONE_OPERATOR_TOKEN;
  }
  return (await readFile(join(statePath(), "operator-token"), "utf8")).trim();
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await operatorToken();
  return fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "x-operator-token": token,
      ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...init.headers,
    },
  });
}

async function expectOk(response: Response): Promise<unknown> {
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    const error = (body as { error?: { message?: string; remediation?: string } })?.error;
    throw new Error(
      `${response.status} ${error?.message ?? response.statusText}${
        error?.remediation ? ` — ${error.remediation}` : ""
      }`,
    );
  }
  return body;
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

program.name("nexphone").description("NexPhone operator CLI").version("0.1.0");

program
  .command("status")
  .description("Show deployment, runtime and session status")
  .action(async () => {
    print(await expectOk(await api("/api/status")));
  });

program
  .command("pair")
  .description("Issue a single-use pairing code for a phone")
  .action(async () => {
    const result = (await expectOk(await api("/api/pair/code", { method: "POST" }))) as {
      code: string;
      expiresAt: string;
    };
    print({ code: result.code, expiresAt: result.expiresAt });
    process.stdout.write(`\nEnter code ${result.code} on the phone before ${result.expiresAt}.\n`);
  });

const runtime = program.command("runtime").description("Manage the Android runtime");

runtime.command("status").action(async () => {
  print(await expectOk(await api("/api/runtime")));
});

for (const action of ["start", "stop", "restart"] as const) {
  runtime.command(action).action(async () => {
    print(await expectOk(await api(`/api/runtime/${action}`, { method: "POST" })));
  });
}

const apps = program.command("apps").description("Manage Android applications");

apps.command("list").action(async () => {
  print(await expectOk(await api("/api/apps")));
});

apps
  .command("install")
  .argument("<apk>", "path to an APK file")
  .action(async (apk: string) => {
    const data = await readFile(apk);
    const form = new FormData();
    form.append("package", new Blob([data], { type: "application/vnd.android.package-archive" }), basename(apk));
    print(await expectOk(await api("/api/apps", { method: "POST", body: form })));
  });

apps
  .command("launch")
  .argument("<packageId>")
  .action(async (packageId: string) => {
    print(await expectOk(await api(`/api/apps/${packageId}/launch`, { method: "POST" })));
  });

apps
  .command("stop")
  .argument("<packageId>")
  .action(async (packageId: string) => {
    print(await expectOk(await api(`/api/apps/${packageId}/stop`, { method: "POST" })));
  });

const session = program.command("session").description("Manage remote sessions");

session
  .command("revoke")
  .argument("<sessionId>")
  .action(async (sessionId: string) => {
    const response = await api(`/api/sessions/${sessionId}`, { method: "DELETE" });
    if (!response.ok) {
      await expectOk(response);
    }
    process.stdout.write(`Session ${sessionId} revoked.\n`);
  });

program.parseAsync(process.argv).catch((error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
