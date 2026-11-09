# WebSocket Session Protocol — v1.0

**Status**: Draft for M0
**Endpoint**: `wss://<host>:<port>/ws/session`
**Transport**: TLS required; plaintext `ws://` is rejected.

This protocol carries the live Android screen and user input for one authenticated session. It is
independent of the runtime implementation; the gateway adapts the runtime contract to this
protocol.

## Connection lifecycle

```text
client connect
  │
  ├─ client → auth            (within 5 seconds, over TLS)
  │
  ├─ server → auth_ok         (session bound, capabilities included)
  ├─ server → video_config    (codec and dimensions)
  ├─ server → binary video*   (Annex B access units)
  │
  ├─ client → input*          (JSON)
  ├─ client ↔ server ping/pong
  │
  └─ close                    (one side ends the session or an error occurs)
```

The server MUST close the connection if authentication does not arrive within 5 seconds, with close
code `4401`.

## Authentication

The first client message MUST be:

```json
{
  "type": "auth",
  "token": "<opaque session token>",
  "protocolVersion": "1.0"
}
```

Rules:

- The token is obtained from `POST /api/pair`.
- Tokens MUST NOT be sent in the URL query string, headers captured by default proxies, or logs.
- The server validates expiry, revocation and the single-session rule before sending any frame.
- On success the server replies with `auth_ok` and binds the connection to the session.

```json
{
  "type": "auth_ok",
  "sessionId": "9f1c2f9e-6d1f-4d55-9f25-2c6f0f3b8a11",
  "protocolVersion": "1.0",
  "capabilities": {
    "androidVersion": "14",
    "apiLevel": 34,
    "displayWidth": 720,
    "displayHeight": 1280,
    "fps": 30,
    "features": { "multiTouch": true, "rotation": true }
  }
}
```

## Video

`video_config` precedes the first binary frame:

```json
{
  "type": "video_config",
  "codec": "h264",
  "format": "annexb",
  "width": 720,
  "height": 1280,
  "fps": 30
}
```

- Every binary WebSocket message contains exactly one Annex B H.264 access unit.
- The stream starts with a keyframe (IDR) preceded by SPS/PPS.
- The client decodes with WebCodecs when available; otherwise it uses the packaged tinyh264
  fallback.
- The server MAY drop non-keyframe frames under backpressure, keeping the latest frame. It MUST
  send a keyframe after a drop burst so the client can recover.
- The client MAY request a keyframe:

```json
{ "type": "request_keyframe" }
```

## Input

All input messages use a JSON envelope:

```json
{
  "type": "input",
  "event": { "type": "tap", "x": 320, "y": 640 }
}
```

Supported events:

| Event | Fields | Rules |
| --- | --- | --- |
| `tap` | `x`, `y` | Integers within `video_config` bounds. |
| `swipe` | `x`, `y`, `x2`, `y2`, `durationMs` | Duration 0–5000 ms; endpoints within bounds. |
| `scroll` | `x`, `y`, `deltaX`, `deltaY` | At least one delta non-zero; bounded magnitude. |
| `key` | `keyCode`, `action` (`down` \| `up`) | Android key codes only. |
| `text` | `text` | UTF-8, maximum 1024 characters per message. |

- Coordinates are in the current video coordinate space. The client scales pointer positions from
  CSS pixels using the displayed video size.
- Out-of-bounds coordinates are rejected with `error` and are never clamped.
- The server rate-limits input to a documented maximum; excess events may be coalesced but must not
  reorder taps or keys.
- Multi-touch, if advertised in capabilities, uses `pointerId` and separate `tap`/`swipe` events.

## Control messages

Client:

| Type | Purpose |
| --- | --- |
| `auth` | Authenticate the connection. |
| `input` | Forward one user input event. |
| `request_keyframe` | Ask for a fresh IDR frame. |
| `ping` | Application-level liveness check. |

Server:

| Type | Purpose |
| --- | --- |
| `auth_ok` | Authentication succeeded. |
| `video_config` | Codec and geometry for the stream. |
| `error` | Non-fatal or fatal error description. |
| `pong` | Reply to `ping`, echoing `t`. |
| `status` | Runtime or session state change. |

`ping` / `pong`:

```json
{ "type": "ping", "t": 1731160000000 }
{ "type": "pong", "t": 1731160000000 }
```

## Errors and close codes

Error message:

```json
{
  "type": "error",
  "code": "session_expired",
  "message": "The session is no longer valid. Pair again to continue.",
  "fatal": true
}
```

| Close code | Meaning |
| --- | --- |
| `1000` | Normal closure. |
| `4401` | Missing, invalid, expired or revoked credentials. |
| `4408` | Authentication timeout. |
| `4409` | Another session is active (single-session policy). |
| `4410` | Protocol version unsupported. |
| `4429` | Rate limit exceeded. |
| `1011` | Internal gateway or runtime failure. |

## Reconnection

- The client reconnects with a bounded exponential backoff and jitter.
- The session token remains valid across transient network loss until expiry or revocation.
- On reconnect the client repeats `auth`; the server issues a new `video_config` and keyframe.
- The Android environment and the running application are NOT restarted by reconnection.
- If the token is expired or revoked, the client stops retrying and returns to the pairing screen.
- If another session took over (not permitted in M0), the server closes with `4409`.

## Message size limits

- Control messages: 64 KiB maximum.
- Input `text`: 1024 characters per message.
- Binary video frames: 8 MiB maximum per access unit.
- Oversized messages are rejected with `error` and may terminate the connection.

## Security notes

- All traffic is inside TLS; the gateway MUST reject plaintext upgrades.
- The server MUST NOT echo the token in errors, logs or status messages.
- The server MUST validate every input event against the negotiated bounds and rate limits.
- The gateway MUST enforce authentication independently of any AI component; no AI exists in M0.
