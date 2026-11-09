# ADR-0006: Device Bridge as a consent-bound capability broker

- **Status:** Proposed — requires proof of concept
- **Date:** 2026-11-09
- **Deciders:** Project maintainers
- **Related:** Constitution Principles 10, 17, 23; [Device Bridge](../device-bridge.md)

## Context

The execution environment lacks the physical phone's camera, GPS, microphone and notifications.
Applications and agents may need them. Giving the Android instance direct access to terminal
hardware would dissolve the boundary between environment and terminal and make consent hard to
enforce.

## Options considered

1. **Direct hardware passthrough to the execution environment.** Simple for the app, but the app
   and agent can use hardware without the terminal's explicit involvement; consent and audit are
   weak.
2. **Terminal-side automation only.** The user performs hardware steps manually; no bridge, but
   breaks intent-driven flows.
3. **Broker in the backend with per-request consent.** The terminal registers capabilities, the
   broker issues scoped grants, and the execution environment receives only the resulting value.

## Decision

We will implement an optional Device Bridge as a broker between terminal capabilities and the
backend. It requires explicit consent per capability and request, supports revocation and audit,
and never grants the execution environment direct hardware access.

The first proof of concept covers location read, notifications and clipboard read/write. Camera,
microphone and sensors remain future or experimental until foreground and privacy constraints are
validated.

## Consequences

### Positive

- Consent and audit are enforceable in one place.
- The terminal remains a capability source, not a host.
- The execution environment remains isolated.

### Negative

- Additional protocol and consent UX.
- Some applications may reject mock or forwarded data.
- Continuous capabilities are hard to expose safely.

### Risks and mitigations

- **Applications reject mock location**: document the limitation; never bypass integrity checks.
- **Consent fatigue**: use scoped, explainable prompts; avoid background requests.
- **Data leakage**: minimize, redact and never log raw values.
- **Terminal compromise**: scope grants, expire them and support immediate revocation.

## Affected principles

- Principle 10 — privacy and security by design.
- Principle 17 — terminal independence.
- Principle 23 — graduated authorization.
