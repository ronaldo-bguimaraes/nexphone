# ADR-0007: Application integration mechanism priority

- **Status:** Accepted
- **Date:** 2026-11-09
- **Deciders:** Project maintainers
- **Related:** Constitution Principles 6, 14, 22; [Architecture](../architecture.md)

## Context

NexPhone must operate ordinary applications. Some expose native APIs, some have community MCP
servers, most expose only their UI. Choosing one mechanism as the foundation would either exclude
most applications or couple the platform to specific integrations.

## Options considered

1. **MCP-first**: elegant for tools that support it, but MCP is not universal and would become a
   mandatory dependency.
2. **Application-specific integrations**: reliable per app, but unbounded maintenance and a
   violation of application independence.
3. **Accessibility-first only**: broad, but weaker where a reliable API exists.
4. **Mechanism priority with fallbacks**: choose the most reliable available mechanism per step.

## Decision

For each operation, select the most reliable available mechanism in this order:

1. Native API or documented integration.
2. MCP server or equivalent interoperability interface.
3. Accessibility-based interaction.
4. Visual automation.
5. Native UI mode for the user.

MCP is optional interoperability, never a prerequisite. The selected mechanism is observable, and
application restrictions and integrity checks are respected.

## Consequences

### Positive

- The platform covers both integrated and unintegrated applications.
- Reliable paths are preferred when available.
- MCP remains an option without becoming architecture.

### Negative

- Multiple mechanisms increase testing surface.
- Users may see different fidelity per application.
- Mechanism selection adds decision logic.

### Risks and mitigations

- **Inconsistent behavior**: document the mechanism in status and errors.
- **MCP supply-chain risk**: opt-in, reviewed, sandboxed where possible.
- **Automation restrictions**: fall back to native mode and explain.

## Affected principles

- Principle 6 — general-purpose computer use.
- Principle 14 — interoperability and standards.
- Principle 22 — application independence and mechanism selection.
