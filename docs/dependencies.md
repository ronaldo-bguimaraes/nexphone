# Dependencies

NexPhone is Apache-2.0. Every runtime dependency is permissively licensed; no copyleft or
proprietary component is required for core functionality.

## Backend

| Package | License | Purpose |
| --- | --- | --- |
| fastify | MIT | HTTP server |
| @fastify/websocket | MIT | WebSocket transport |
| @fastify/static | MIT | Client assets |
| @fastify/multipart | MIT | APK uploads |
| zod | MIT | Configuration and protocol validation |
| pino | MIT | Structured logging |
| dockerode | MIT | Runtime container lifecycle |
| @yume-chan/adb | MIT | ADB protocol client |
| @yume-chan/adb-scrcpy | MIT | Scrcpy bootstrap |
| @yume-chan/scrcpy | MIT | Scrcpy protocol |
| @yume-chan/adb-server-node-tcp | MIT | ADB server connector |
| commander | MIT | CLI |
| yaml | ISC | Configuration parsing |
| Node.js built-in `node:sqlite` | MIT (Node.js) | Session and pairing state |

`node:sqlite` replaces the planned Better-SQLite3 dependency because the native module did not
build on the reference Node.js version. It provides the same SQLite durability without a native
toolchain.

## Client

| Package | License | Purpose |
| --- | --- | --- |
| react / react-dom | MIT | UI |
| @yume-chan/scrcpy-decoder-webcodecs | MIT | WebCodecs H.264 decoding |
| @yume-chan/scrcpy-decoder-tinyh264 | MIT | Software decode fallback |

## Deployment

| Component | License | Purpose |
| --- | --- | --- |
| Caddy 2 | Apache-2.0 | Local TLS and reverse proxy |
| Redroid (provisional) | Apache-2.0 / GPL components per image | Android runtime; license review required per image variant |
| scrcpy-server 3.3.3 | Apache-2.0 | Screen capture and input |
| Android platform-tools | Apache-2.0 | ADB |
| Ubuntu 24.04 | Various free licenses | Host OS |

## Pinning

- Runtime image: pinned by `sha256` digest, enforced by configuration validation.
- scrcpy server: downloaded at image build and verified against
  `7e70323ba7f259649dd4acce97ac4fefbae8102b2c6d91e2e7be613fd5354be0`.
- Node dependencies: pinned by `package-lock.json`.
- Caddy: pinned by the minor image tag; pin by digest before a production release.

## Review notes

- Redroid image variants that bundle libhoudini or Magisk may carry additional licensing
  obligations. Use the 64-bit-only public image first and review any native-bridge variant before
  enabling it.
- `npm audit` reports advisories in transitive development dependencies. Re-check before each
  release and prefer updating over suppressing.
