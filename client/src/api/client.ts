export interface PairResponse {
  token: string;
  sessionId: string;
  expiresAt: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    remediation?: string;
  };
}

export async function pair(code: string, clientName: string): Promise<PairResponse> {
  const response = await fetch("/api/pair", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, clientName }),
  });
  const body = (await response.json()) as PairResponse | ApiError;
  if (!response.ok) {
    throw new Error((body as ApiError).error?.message ?? `Pairing failed (${response.status})`);
  }
  return body as PairResponse;
}

export async function revoke(token: string): Promise<void> {
  await fetch("/api/session", {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  }).catch(() => undefined);
}

export function websocketUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/session`;
}
