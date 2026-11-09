const KEY = "nexphone.session";

export function loadToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // session storage may be unavailable in private modes
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
