# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-11-09
- **Deciders:** Project maintainers
- **Related:** [Constitution — Architecture Decision Governance](../../.specify/memory/constitution.md#architecture-decision-governance)

## Context

NexPhone spans three independently replaceable subsystems — an Android runtime, an AI engine and
a client — with strict requirements around local-first operation, user control, privacy and
runtime replaceability. The constitution requires that decisions affecting subsystem boundaries,
security, persistence, compatibility or deployment be documented as Architecture Decision Records
(ADRs), including the problem, alternatives, selected approach, consequences and affected
principles.

The project is at its inception. It has no code and no established decision log. Without a
recorded mechanism, architectural rationale will live only in issues and chat, making later
changes hard to evaluate and subsystem replacements hard to justify.

## Options considered

1. **No formal decision log.** Rely on issues, pull requests and commit messages.
   - Strengths: no process overhead.
   - Weaknesses: rationale is fragmented and lost; violates the constitution's ADR requirement;
     makes boundary changes and runtime replacement hard to audit.

2. **A wiki or external document store.** Keep decisions outside the repository.
   - Strengths: easy editing.
   - Weaknesses: not versioned with the code, easy to drift, unavailable offline and in forks.

3. **In-repository ADRs in `docs/adr/`.** One numbered Markdown file per decision, with a
   template and an index.
   - Strengths: versioned with the code, reviewable in pull requests, works offline, portable,
     follows a widely used convention.
   - Weaknesses: requires discipline to write and maintain; adds review overhead for significant
     changes.

## Decision

We will record architecture decisions as in-repository ADRs under `docs/adr/`, using the template
in [`0000-template.md`](0000-template.md) and sequential four-digit numbering. Each ADR records
status, date, context, options, decision, consequences and affected principles.

ADRs are submitted by pull request together with the change they describe. Accepted ADRs are
immutable; a later decision supersedes an earlier one through a new ADR rather than by editing
history.

## Consequences

### Positive

- Architectural rationale is versioned, reviewable and available offline and in forks.
- Significant changes have an explicit place to evaluate alternatives and principle conflicts.
- Subsystem boundaries and runtime replaceability gain an auditable trail.
- New contributors can understand why the system is shaped the way it is.

### Negative

- Each significant change carries a small documentation and review cost.
- Numbering and status must be maintained by hand.

### Risks and mitigations

- **ADRs become stale or ignored.** Mitigation: the pull request template requires an ADR
  decision, and compliance review checks for one when a change touches architecture, security,
  persistence, compatibility or deployment.
- **ADRs are written after the fact as rubber stamps.** Mitigation: require the ADR in the same
  pull request as the change, while alternatives are still open.

## Affected principles

- **Principle 12 — Modular and Extensible Engineering:** makes component boundaries and
  dependency decisions explicit and reviewable.
- **Principle 13 — Incremental and Testable Development:** records assumptions and decisions
  before implementation.
- **Principle 3 — Separation of Core Subsystems:** provides the mechanism to document and defend
  subsystem boundaries.
- **Governance — Architecture Decision Governance:** implements the constitutional requirement
  directly.
