# ADR-0009: Terminal independence and declarative UI contract

- **Status:** Accepted
- **Date:** 2026-11-09
- **Deciders:** Project maintainers
- **Related:** Constitution Principles 17, 19, 21; ADR-0004

## Context

The M0 terminal is an Android web browser. The vision includes tablets, desktops, dedicated
terminals and embedded devices. If generated interfaces are implemented as Android-specific
overlays or arbitrary HTML from the backend, other terminals cannot reuse them and policy cannot be
enforced consistently.

## Options considered

1. **Native Android app only.** Best device integration for one platform, but violates terminal
   independence.
2. **Backend-generated arbitrary web UI.** Flexible, but a large attack surface and inconsistent
   rendering across terminals.
3. **Declarative, versioned UI schema rendered by each terminal.** Constrained, portable,
   accessible and policy-friendly.

## Decision

The Backend generates a versioned declarative UI schema. Terminals implement renderers for a
defined component set and send state-versioned actions. The backend never sends executable code.

The schema includes accessibility metadata, sensitive-field flags and permission levels. Unknown
components cause a safe fallback to native mode or a basic renderer, not arbitrary HTML.

## Consequences

### Positive

- One generated interface works on phones, tablets, desktops and future terminals.
- The attack surface stays bounded.
- Accessibility and permission metadata travel with the component.

### Negative

- New visual ideas require schema extensions.
- Terminals must keep renderers in sync with schema versions.
- A lowest-common-denominator UI may be less expressive than native.

### Risks and mitigations

- **Schema fragmentation**: semantic versioning and a compatibility test suite.
- **Renderer drift**: shared component fixtures and screenshots.
- **Weak terminals**: support a basic text/form renderer.
- **Sensitive data**: mark fields and render locally; never include values in the schema.

## Affected principles

- Principle 17 — terminal independence.
- Principle 19 — intent-driven interfaces.
- Principle 21 — adaptive modes and coexistence.
