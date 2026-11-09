# ADR-0005: Deterministic-first interpretation hierarchy

- **Status:** Accepted
- **Date:** 2026-11-09
- **Deciders:** Project maintainers
- **Related:** Constitution Principle 20; [UI Engine](../ui-engine.md)

## Context

A screenshot-to-LLM-to-click loop is easy to demo but slow, expensive, privacy-invasive and
unreliable as a default. Most ordinary application screens expose enough structure to interpret
deterministically. The constitution now requires deterministic-first behavior and forbids making
the visual loop the default.

## Options considered

1. **Screenshot-first with a vision model for every step.** Maximum generality on paper, but high
   latency and cost, sends screen content to a model by default, and is fragile for precise input.
2. **Accessibility-only.** Fast and private, but fails on custom-rendered surfaces and apps with
   poor semantics.
3. **Hierarchical fallback:** deterministic accessibility rules, then semantic model assistance,
   then visual interpretation, then native mode.

## Decision

We will use a three-level hierarchy:

1. **Deterministic**: accessibility hierarchy, roles, labels, input types, cached mappings.
2. **Semantic**: an LLM receives a redacted structured hierarchy and must return the validated
   normalized schema.
3. **Visual**: a vision model receives a masked screenshot and returns a candidate state.

The system selects the lowest level that succeeds, records the level and confidence, and always
allows native mode. Level 3 is experimental and disabled by default. Proposed performance targets
are engineering hypotheses to be measured, not guarantees.

## Consequences

### Positive

- Ordinary forms are fast, private and cheap.
- Model usage is explicit and measurable.
- The platform still degrades gracefully when accessibility or a model is unavailable.

### Negative

- The deterministic rule set requires maintenance as applications change.
- The semantic schema must be validated strictly to avoid unsafe actions.
- Caching can cause stale actions if invalidation is wrong.

### Risks and mitigations

- **Deterministic coverage is lower than expected**: measure it and keep semantic fallback.
- **Model output is invalid or unsafe**: validate against the schema and reject.
- **Visual fallback is inaccurate**: keep it experimental and always expose native mode.
- **Stale cache**: include `stateVersion` in every action and invalidate on relevant changes.

## Affected principles

- Principle 6 — general-purpose computer use.
- Principle 13 — incremental and testable development.
- Principle 20 — deterministic-first interaction.
