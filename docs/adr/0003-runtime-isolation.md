# ADR-0003: Runtime isolation and capability set

- **Status:** Proposed — pending Phase 0 spike
- **Date:** 2026-11-09
- **Deciders:** Project maintainers
- **Related:** [ADR-0002](0002-runtime-adapter-contract.md), Principle 10

## Context

The constitution requires that Android instances not receive unrestricted host privileges and that
host access be restricted. Public Redroid recipes commonly use Docker `--privileged`, which
disables that boundary. M0 must either prove a restricted configuration or reject Redroid.

## Options considered

1. **Use `--privileged` for M0 and tighten later.** Rejected: violates Principle 10 and sets an
   unsafe precedent.
2. **Restricted container**: no privileged mode, drop most capabilities, grant only what is
   required (`SYS_ADMIN`, `NET_ADMIN` as a starting hypothesis), bridge network, data-only bind
   mount, no Docker socket, no host PID/network namespace, `no-new-privileges`.
3. **VM-isolated runtime** (Cuttlefish or AOSP emulator): stronger isolation by construction, at
   higher CPU, memory and startup cost.
4. **Rootless container**: promising, but binder and mount operations may still require
   capabilities; needs testing.

## Decision

M0 will attempt option 2 first. The implementation already refuses `Privileged: true`, mounts only
the configured data path, uses a private bridge network and sets `no-new-privileges`.

The exact capability list is **not accepted until the Phase 0 spike proves Android boots and an
application runs**. If option 2 fails, Redroid is rejected and option 3 is evaluated before US1
implementation continues.

## Consequences

### Positive

- Preserves the constitutional security boundary.
- Keeps the runtime replaceable if Redroid cannot meet the gate.
- Produces a documented, auditable capability set.

### Negative

- Redroid may not boot with the restricted set.
- A VM-isolated fallback increases host requirements and complexity.
- The gate adds a blocking spike before the first functional milestone.

### Risks and mitigations

- **Isolation is weaker than expected**: run `deploy/scripts/check-isolation.sh` and document every
  capability; reject the runtime if the set cannot be minimized.
- **Functionality regressions from dropped capabilities**: test boot, app install, screen capture
  and input under the restricted set.
- **Silent fallback to privileged mode**: the adapter has no privileged code path, and tests assert
  `Privileged: false`.

## Affected principles

- Principle 9 — user control (authorization outside the runtime).
- Principle 10 — privacy and security by design.
- Principle 11 — persistent and reliable environments.
