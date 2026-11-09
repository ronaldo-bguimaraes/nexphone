# ADR-0008: Execution environment independence

- **Status:** Accepted
- **Date:** 2026-11-09
- **Deciders:** Project maintainers
- **Related:** Constitution Principles 3, 4, 18; ADR-0002

## Context

The current adapter contract targets Android runtimes. The product vision may add Linux and browser
execution environments. If the agent, UI Engine or terminal assumes Android, adding another
environment would require a redesign.

## Options considered

1. **Keep Android-only contracts.** Fastest, but contradicts the long-term vision and Principle 18.
2. **Redesign around a generic environment contract now.** Pure but speculative; the team has not
   validated a second environment.
3. **Generalize the contract's vocabulary now, implement only Android.** Keep the adapter boundary,
   express capabilities and operations in environment-neutral terms, and validate the second
   environment when it exists.

## Decision

We will keep the versioned adapter contract but express its semantics in environment-neutral
terms: lifecycle, capabilities, applications/resources, screen, input and persistent state. Android
specifics remain inside the Android adapter. A second environment is not implemented until M4 and
will require a contract review.

The UI Engine consumes a normalized application state, not Android accessibility nodes. The
accessibility observer is an Android-specific producer of that state.

## Consequences

### Positive

- The agent and terminal do not encode Android assumptions.
- A second environment can be added behind the same boundary.
- The UI Engine's normalized state becomes the portability layer.

### Negative

- Some Android capabilities do not map cleanly to other environments.
- Premature generalization could produce empty abstractions.

### Risks and mitigations

- **Over-abstraction**: add only semantics needed by a validated second environment; avoid
  speculative fields.
- **Capability mismatch**: capability discovery makes unsupported features explicit.
- **Hidden Android coupling**: boundary tests and a second environment spike.

## Affected principles

- Principle 3 — separation of core subsystems.
- Principle 4 — runtime abstraction and replaceability.
- Principle 18 — execution environment independence.
