import { useCallback, useState } from "react";
import { pair } from "../api/client.js";
import { saveToken } from "./tokenStore.js";

export interface PairingScreenProps {
  onPaired: (token: string) => void;
}

export function PairingScreen({ onPaired }: PairingScreenProps): JSX.Element {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setBusy(true);
      setError(null);
      try {
        const result = await pair(code, navigator.userAgent.slice(0, 64));
        saveToken(result.token);
        onPaired(result.token);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Pairing failed");
      } finally {
        setBusy(false);
      }
    },
    [code, onPaired],
  );

  return (
    <main className="pairing">
      <header>
        <h1>NexPhone</h1>
        <p>Enter the 8-digit code shown on your host.</p>
      </header>
      <form onSubmit={submit} className="pairing-form">
        <label htmlFor="pairing-code">Pairing code</label>
        <input
          id="pairing-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{8}"
          maxLength={8}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          placeholder="00000000"
          required
        />
        <button type="submit" disabled={busy || code.length !== 8}>
          {busy ? "Pairing…" : "Connect"}
        </button>
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
      </form>
      <footer>
        <p>Traffic stays on your local network and is encrypted.</p>
      </footer>
    </main>
  );
}
