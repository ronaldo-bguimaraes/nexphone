import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { AdapterError } from "../runtime/errors.js";
import { encodeVideoFrame } from "../remote/video.js";
import { forwardInput } from "../remote/input.js";
import {
  PROTOCOL_VERSION,
  parseClientMessage,
  type ClientMessage,
} from "../remote/protocol.js";
import type { Services } from "./services.js";

const MAX_BUFFERED_BYTES = 1_000_000;
const AUTH_TIMEOUT_MS = 5_000;

export function registerStreamRoutes(app: FastifyInstance, services: Services): void {
  app.get("/ws/session", { websocket: true }, (socket, _request) => {
    let sessionId: string | null = null;
    let width = services.config.runtime.display.width;
    let height = services.config.runtime.display.height;
    let transport: Awaited<ReturnType<Services["adapter"]["openTransport"]>> | null = null;
    let authenticating = false;

    const authTimer = setTimeout(() => {
      if (!sessionId) {
        socket.close(4408, "authentication timeout");
      }
    }, AUTH_TIMEOUT_MS);

    const unsubscribe = services.sessions.onRevoke((revokedId) => {
      if (revokedId === sessionId) {
        sendError(socket, "session_revoked", "The session was revoked.", true);
        socket.close(4401, "session revoked");
      }
    });

    socket.on("message", (raw, isBinary) => {
      if (isBinary) {
        sendError(socket, "unexpected_binary", "Clients do not send binary frames.", false);
        return;
      }
      void handleMessage(Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw));
    });

    socket.on("close", () => {
      clearTimeout(authTimer);
      unsubscribe();
      void transport?.close().catch(() => undefined);
      transport = null;
    });

    socket.on("error", () => {
      clearTimeout(authTimer);
      unsubscribe();
    });

    async function handleMessage(text: string): Promise<void> {
      let message: ClientMessage;
      try {
        message = parseClientMessage(text);
      } catch (error) {
        sendError(socket, "invalid_message", (error as Error).message, false);
        return;
      }

      if (!sessionId) {
        if (message.type !== "auth" || authenticating) {
          socket.close(4401, "authentication required");
          return;
        }
        authenticating = true;
        await authenticate(message);
        return;
      }

      if (message.type === "auth") {
        return;
      }

      if (message.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", t: message.t }));
        return;
      }

      if (message.type === "request_keyframe") {
        // The runtime sends keyframes on its own schedule; the client recovers
        // automatically on the next available IDR.
        return;
      }

      if (message.type === "input") {
        if (!transport) {
          sendError(socket, "stream_unavailable", "The screen stream is not available.", true);
          return;
        }
        const started = performance.now();
        try {
          await forwardInput(message.event, transport.input, width, height);
          services.latency.record(performance.now() - started);
        } catch (error) {
          if (error instanceof AdapterError) {
            sendError(socket, error.code.toLowerCase(), error.message, false);
          }
        }
      }
    }

    async function authenticate(message: Extract<ClientMessage, { type: "auth" }>): Promise<void> {
      if (message.protocolVersion !== PROTOCOL_VERSION) {
        socket.close(4410, "unsupported protocol version");
        return;
      }
      const session = await services.sessions.validate(message.token);
      if (!session) {
        socket.close(4401, "invalid session");
        return;
      }
      sessionId = session.id;
      clearTimeout(authTimer);

      const status = await services.adapter.getStatus();
      if (status.state !== "ready") {
        sendError(socket, "runtime_not_ready", "The Android runtime is not ready.", true);
        socket.close(1011, "runtime not ready");
        return;
      }

      try {
        const capabilities = await services.adapter.getCapabilities();
        width = capabilities.displayWidth;
        height = capabilities.displayHeight;
        transport = await services.adapter.openTransport();
        socket.send(
          JSON.stringify({
            type: "auth_ok",
            sessionId,
            protocolVersion: PROTOCOL_VERSION,
            capabilities,
          }),
        );
        socket.send(
          JSON.stringify({
            type: "video_config",
            codec: "h264",
            format: "h264-annexb",
            width,
            height,
            fps: capabilities.fps,
          }),
        );
        void pumpVideo(transport, socket, services);
      } catch (error) {
        sendError(
          socket,
          "stream_failed",
          error instanceof Error ? error.message : "Could not open the stream",
          true,
        );
        socket.close(1011, "stream failed");
      }
    }
  });
}

async function pumpVideo(
  transport: Awaited<ReturnType<Services["adapter"]["openTransport"]>>,
  socket: WebSocket,
  services: Services,
): Promise<void> {
  try {
    for await (const packet of transport.video) {
      if (socket.readyState !== socket.OPEN) {
        break;
      }
      if (socket.bufferedAmount > MAX_BUFFERED_BYTES && !packet.keyframe) {
        continue;
      }
      const frame = encodeVideoFrame(packet);
      socket.send(frame.binary);
    }
  } catch (error) {
    if (socket.readyState === socket.OPEN) {
      sendError(
        socket,
        "stream_failed",
        error instanceof Error ? error.message : "The screen stream failed",
        true,
      );
      socket.close(1011, "stream failed");
    }
  }
  void services;
}

function sendError(socket: WebSocket, code: string, message: string, fatal: boolean): void {
  if (socket.readyState !== socket.OPEN) {
    return;
  }
  socket.send(JSON.stringify({ type: "error", code, message, fatal }));
}
