# Architecture Decision Records

This directory holds the Architecture Decision Records (ADRs) for NexPhone.

The [constitution](../../.specify/memory/constitution.md) requires that decisions affecting
subsystem boundaries, security, persistence, compatibility or deployment be documented as ADRs,
and that each record identifies the problem, the alternatives, the chosen approach, its
consequences and any affected principles.

## When to write an ADR

Write an ADR when a decision:

- Changes or clarifies a subsystem boundary or a public interface.
- Affects security, authorization, isolation or credential handling.
- Affects persistence, backup or recovery guarantees.
- Affects compatibility with Android applications, runtimes or clients.
- Changes deployment requirements or supported platforms.
- Commits the project to a significant dependency or technology.

Routine implementation choices that are local to one component and easily reversible do not need
an ADR.

## Process

1. Copy [`0000-template.md`](0000-template.md) to the next sequential number, for example
   `0002-short-title.md`. Use lowercase kebab-case titles.
2. Fill in the context, options, decision and consequences. State which constitutional principles
   are affected.
3. Open a pull request with the ADR. For a decision that accompanies code, include the ADR in the
   same pull request.
4. Discussion happens in the pull request. Core maintainers approve the decision.
5. Once accepted, an ADR is immutable. To change a decision, add a new ADR that supersedes the
   old one and update the status of the old record to `Superseded by ADR-NNNN`.

## Status values

- **Proposed** — under discussion, not yet binding.
- **Accepted** — approved and in effect.
- **Rejected** — considered and declined; kept for the record.
- **Superseded by ADR-NNNN** — replaced by a later decision.
- **Deprecated** — no longer recommended, not yet replaced.

## Index

| ADR                                                      | Title                          | Status   | Date       |
| -------------------------------------------------------- | ------------------------------ | -------- | ---------- |
| [0001](0001-record-architecture-decisions.md)            | Record architecture decisions  | Accepted | 2026-11-09 |
