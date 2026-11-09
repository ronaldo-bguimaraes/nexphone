# ADR-0004: Intent-driven UI Engine and three-role architecture

- **Status:** Accepted
- **Date:** 2026-11-09
- **Deciders:** Project maintainers
- **Related:** Constitution Principles 3, 7, 17, 19, 21; ADR-0002, ADR-0008, ADR-0009

## Context

M0 delivers a native remote screen. The product vision requires users to complete tasks through
intentions and contextual interfaces, without navigating every application's native UI. The
existing documents describe "dynamic interfaces" but no component owns observation, interpretation,
generation or action mapping.

The platform is also described as three subsystems (Android Runtime, AI Engine, Client), while the
evolved vision needs three roles (Backend, Terminal, Agent) and a UI Engine. Without a decision,
generated interfaces risk becoming terminal-specific overlays or ad-hoc LLM prompts.

## Options considered

1. **Native-screen-only**: keep M0 and rely on the agent to tap through screens. Simple, but fails
   the intent-driven product promise and forces users to understand every interface.
2. **Application-specific integrations only**: reliable where available, but violates application
   independence and cannot cover arbitrary apps.
3. **Terminal-side generation**: the client interprets and renders. Fast for one terminal, but
   duplicates logic, couples rendering to a platform and weakens policy enforcement.
4. **Backend UI Engine with a declarative terminal contract**: observe and interpret in the
   backend, generate a versioned UI schema, render on any terminal, map actions back through the
   backend.

## Decision

We will implement an intent-driven **UI Engine inside the Backend** with four responsibilities:
Observer, State Interpreter, UI Generator and Action Mapper. Terminals render a versioned
declarative schema and send state-versioned actions; they never receive arbitrary code.

The three roles are:

- **Backend**: execution environments, agent, UI Engine, policy and persistence.
- **Terminal**: display, input, connectivity and optional device capabilities.
- **Agent**: intention interpretation, planning, execution and reporting.

The existing three subsystems map to these roles: the Android Runtime is an execution environment
inside the Backend, the AI Engine is the Agent runtime, and the Client is the Terminal.

## Consequences

### Positive

- One interpretation/generation path serves every terminal.
- Policy and sensitive-data handling stay in the Backend.
- Terminals remain thin and replaceable.
- The native screen remains a first-class fallback.

### Negative

- Backend complexity increases; observation and generation must be secured and rate-limited.
- The declarative schema needs careful versioning and accessibility design.
- A terminal cannot innovate on rendering without a schema extension.

### Risks and mitigations

- **Leaky schema**: version it and validate it; no arbitrary code.
- **Accessibility gaps**: native fallback and the experimental visual path.
- **Over-generation**: deterministic templates and state-version checks.

## Affected principles

- Principle 3 — subsystem separation, now expressed as Backend/Terminal/Agent roles.
- Principle 7 — AI-native interaction.
- Principle 17 — terminal independence.
- Principle 19 — intent-driven interfaces.
- Principle 21 — adaptive modes and coexistence.
