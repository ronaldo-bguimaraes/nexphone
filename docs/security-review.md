# Security review — M0

**Date**: 2026-11-09
**Scope**: gateway, web client, runtime adapter, deployment artifacts.
**Status**: Code-level review complete; host-level validation pending (`docs/validation/m0-results.md`).

## Controls implemented

| Area | Control | Location |
| --- | --- | --- |
| Pairing | 8-digit single-use code, 5-minute TTL, SHA-256 with a persistent server pepper | `backend/src/auth/pairing.ts`, `backend/src/auth/pepper.ts` |
| Rate limiting | 5 attempts per minute per source, no existence oracle | `backend/src/auth/pairing.ts` |
| Sessions | 256-bit token, SHA-256 at rest, idle and absolute expiry, durable revocation | `backend/src/auth/sessions.ts`, `backend/src/storage/db.ts` |
| Single session | One active session; second pairing refused with 409 | `backend/src/auth/sessions.ts`, `backend/src/api/pairing.ts` |
| WebSocket auth | First message over TLS, 5-second timeout, close code 4401 | `backend/src/api/stream.ts` |
| Transport | TLS terminated by Caddy with an internal CA; HSTS and security headers | `deploy/caddy/Caddyfile` |
| Authorization boundary | Gateway enforces auth; no AI component exists in M0 | `backend/src/api/middleware.ts` |
| Secrets in logs | Pino redaction plus an allow-list for event details | `backend/src/observability/logger.ts`, `backend/src/observability/events.ts` |
| Input validation | Schema validation, display-bounds checks, text length limits | `backend/src/remote/protocol.ts` |
| Runtime isolation | `Privileged: false`, `no-new-privileges`, bridge network, limited mounts | `backend/src/runtime/redroid/container.ts` |
| Storage checks | Missing/read-only/unsafe/inconsistent detection; no destructive recovery | `backend/src/storage/environment.ts` |
| Artifact pinning | Runtime image digest required; scrcpy server checksum verified at build | `backend/src/config/schema.ts`, `backend/Dockerfile` |
| Telemetry | None by default | entire codebase |

## Verified in tests

- Pairing expiry, single use, rate limiting and non-disclosure.
- Session expiry, revocation and single-session enforcement.
- Log redaction of tokens, codes and event details.
- Input bounds and protocol validation.
- Isolation flags in the container specification (`Privileged: false`, no Docker socket).

## Open risks

1. **Docker socket in the gateway.** The gateway mounts `/var/run/docker.sock` to manage the
   runtime. It is a trusted local control plane, but a gateway compromise grants host control.
   Mitigation for M0: gateway is not exposed beyond Caddy, runs as a non-root user, and is the
   smallest possible image. A socket proxy with a restricted API allow-list is recommended for M1.
2. **Local CA trust.** The phone trusts Caddy's root CA. Anyone who can install a root CA on the
   phone can intercept its traffic; this is an accepted local-network trade-off.
3. **Redroid isolation.** The documented capability set (`SYS_ADMIN`, `NET_ADMIN`) is still broad.
   The Phase 0 spike must confirm the minimum set; if Redroid cannot run without `--privileged`,
   it must be replaced by a VM-isolated runtime.
4. **Browser trust boundary.** The phone browser and OS are part of the trust boundary and are not
   hardened by NexPhone.
5. **Application risk.** Android applications running in the environment are untrusted code; they
   must not gain host access.

## Not in scope for M0

- Multi-user authentication and authorization.
- Public-internet exposure and NAT traversal.
- Audit log export and SIEM integration.
- Automated vulnerability scanning of the runtime image.
