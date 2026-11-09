import { useCallback, useEffect, useRef, useState } from "react";
import { revoke, websocketUrl } from "./api/client.js";
import { attachInput } from "./input/capture.js";
import { PairingScreen } from "./session/pairing.jsx";
import { createBackoff, type ConnectionState } from "./session/reconnect.js";
import { clearToken, loadToken } from "./session/tokenStore.js";
import { createDecoder, type VideoDecoderHandle } from "./stream/decoder.js";
import { decodeVideoFrame } from "./stream/frames.js";
import { ConnectionStatus } from "./ui/ConnectionStatus.jsx";

export function App(): JSX.Element {
  const [token, setToken] = useState<string | null>(() => loadToken());

  const signOut = useCallback(() => {
    if (token) {
      void revoke(token);
    }
    clearToken();
    setToken(null);
  }, [token]);

  if (!token) {
    return <PairingScreen onPaired={setToken} />;
  }
  return <SessionScreen token={token} onSignOut={signOut} />;
}

interface SessionScreenProps {
  token: string;
  onSignOut: () => void;
}

function SessionScreen({ token, onSignOut }: SessionScreenProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<ConnectionState>("connecting");
  const [message, setMessage] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    let closed = false;
    let decoder: VideoDecoderHandle | null = null;
    let detachInput: (() => void) | null = null;
    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    const backoff = createBackoff();

    const cleanup = () => {
      detachInput?.();
      detachInput = null;
      decoder?.dispose();
      decoder = null;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      socket?.close();
      socket = null;
    };

    const connect = () => {
      if (closed) {
        return;
      }
      setState((current) => (current === "idle" ? "connecting" : "reconnecting"));
      socket = new WebSocket(websocketUrl());
      socket.binaryType = "arraybuffer";

      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "auth", token, protocolVersion: "1.0" }));
      };

      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          const payload = JSON.parse(event.data) as {
            type: string;
            message?: string;
            code?: string;
            fatal?: boolean;
            width?: number;
            height?: number;
            fps?: number;
          };
          if (payload.type === "auth_ok") {
            backoff.reset();
            setState("connected");
            setMessage(null);
          } else if (payload.type === "video_config") {
            canvas.width = payload.width ?? canvas.width;
            canvas.height = payload.height ?? canvas.height;
            if (!decoder) {
              decoder = createDecoder(canvas);
              detachInput = attachInput({
                element: canvas,
                videoSize: () => ({ width: canvas.width, height: canvas.height }),
                sender: {
                  sendTap: (x, y) => send({ type: "input", event: { type: "tap", x, y } }),
                  sendSwipe: (x, y, x2, y2, durationMs) =>
                    send({ type: "input", event: { type: "swipe", x, y, x2, y2, durationMs } }),
                  sendScroll: (x, y, deltaX, deltaY) =>
                    send({ type: "input", event: { type: "scroll", x, y, deltaX, deltaY } }),
                  sendKey: (keyCode, action) =>
                    send({ type: "input", event: { type: "key", keyCode, action } }),
                  sendText: (text) => send({ type: "input", event: { type: "text", text } }),
                },
              });
            }
          } else if (payload.type === "error") {
            setMessage(payload.message ?? "Connection error");
            if (payload.fatal) {
              setState("disconnected");
            }
          }
          return;
        }

        if (!decoder) {
          return;
        }
        try {
          const frame = decodeVideoFrame(event.data as ArrayBuffer);
          void decoder.write(frame.packet).catch((error: Error) => {
            setMessage(error.message);
          });
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Video decode failed");
        }
      };

      socket.onclose = (event) => {
        decoder?.dispose();
        decoder = null;
        detachInput?.();
        detachInput = null;
        if (closed) {
          return;
        }
        if (event.code === 4401 || event.code === 4409 || event.code === 4410) {
          setState("disconnected");
          setMessage("The session ended. Pair again to continue.");
          return;
        }
        setState("reconnecting");
        const delay = backoff.next();
        retryTimer = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        setMessage("The connection failed.");
      };
    };

    const send = (value: unknown) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(value));
      }
    };

    connect();
    return () => {
      closed = true;
      cleanup();
    };
  }, [token, generation]);

  return (
    <main className="session">
      <header className="session-header">
        <h1>NexPhone</h1>
        <ConnectionStatus
          state={state}
          message={message}
          onRetry={() => {
            setMessage(null);
            setGeneration((value) => value + 1);
          }}
        />
        <button type="button" onClick={onSignOut} className="signout">
          Disconnect
        </button>
      </header>
      <div className="screen">
        <canvas ref={canvasRef} width={720} height={1280} tabIndex={0} aria-label="Remote Android screen" />
      </div>
    </main>
  );
}
