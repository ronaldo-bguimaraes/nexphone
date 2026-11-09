import type { ConnectionState } from "../session/reconnect.js";

export interface ConnectionStatusProps {
  state: ConnectionState;
  message?: string | null;
  onRetry?: () => void;
}

export function ConnectionStatus({ state, message, onRetry }: ConnectionStatusProps): JSX.Element {
  return (
    <div className={`connection connection-${state}`} role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      <span>{labelFor(state)}</span>
      {message ? <span className="connection-message">{message}</span> : null}
      {state === "disconnected" && onRetry ? (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

function labelFor(state: ConnectionState): string {
  switch (state) {
    case "idle":
      return "Idle";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Connected";
    case "reconnecting":
      return "Reconnecting";
    case "disconnected":
      return "Disconnected";
  }
}
