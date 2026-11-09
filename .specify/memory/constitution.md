# NexPhone Constitution

**Version:** 1.0.0
**Project:** NexPhone
**Status:** Ratified

## Preamble

NexPhone is an open-source, self-hosted, AI-native personal computing platform.

Its purpose is to make artificial intelligence the primary interface through which people
interact with applications and digital services.

NexPhone combines a remotely hosted Android application environment, an intelligent
orchestration engine and a lightweight client interface.

The project prioritizes user autonomy, local execution, modularity, privacy and extensibility.

All architectural and implementation decisions MUST uphold the principles established in this
constitution.

## Core Principles

### Principle 1 — Open Source and User Sovereignty

NexPhone MUST remain open source and self-hostable.

- Users MUST be able to operate their own installations.
- No mandatory commercial service may be required for core functionality.
- External services MUST remain optional.
- Users MUST retain control over their data, credentials and computing environment.
- Dependencies MUST be evaluated for licensing compatibility.
- Core functionality MUST NOT depend on proprietary infrastructure controlled by the project
  maintainers.

The project SHOULD favor permissively licensed dependencies when technically appropriate.

### Principle 2 — Local-First Architecture

Local execution is the default deployment model.

- The complete platform SHOULD run on a user's own computer or server.
- The initial supported deployment target MUST be Linux.
- Core functionality MUST work without internet connectivity wherever technically possible.
- Local inference MUST be supported.
- External LLM providers MAY be supported as optional alternatives.
- Remote connectivity MUST NOT be a prerequisite for local-network operation.

The architecture MAY support remote and multi-user deployments in the future without making them
mandatory.

### Principle 3 — Separation of Core Subsystems

NexPhone MUST maintain architectural independence between three primary subsystems:

1. Android Runtime.
2. AI Engine.
3. Client Application.

Each subsystem MUST have clearly defined responsibilities and communication contracts.

- The AI Engine MUST NOT depend on Android-runtime-specific implementation details.
- The Client MUST NOT depend directly on the internal implementation of the Android Runtime.
- The Android Runtime MUST NOT require the AI Engine to execute applications.
- Communication between subsystems MUST use documented interfaces.
- Internal implementation details MUST NOT leak across subsystem boundaries.

Replacing one subsystem SHOULD NOT require rewriting the others.

### Principle 4 — Runtime Abstraction and Replaceability

The Android Runtime MUST be accessed through a standardized abstraction layer.

- Runtime-specific operations MUST be encapsulated in adapters.
- The backend MUST communicate with runtimes through documented contracts.
- Runtime capabilities MUST be discoverable.
- Runtime implementations MUST be independently testable.
- Alternative Android runtime implementations SHOULD be supported.

Redroid is the initial implementation candidate, not a permanent architectural dependency.

Future implementations MAY include customized AOSP-based environments or other compatible Android
execution technologies.

### Principle 5 — Application-Centric Android Environment

The virtual Android environment exists primarily to execute applications.

- A conventional launcher MUST NOT be a requirement.
- A traditional Android home screen MUST NOT be required for normal operation.
- Applications SHOULD be launched directly when requested.
- Unnecessary system components SHOULD be excluded when compatibility permits.
- Essential Android framework services MUST be preserved.
- Application lifecycle and persistent storage MUST be managed reliably.

Compatibility MUST take precedence over aggressive system minimization.

The project MUST NOT assume that every Android application works without Google services, hardware
capabilities or device-specific dependencies.

### Principle 6 — General-Purpose Computer Use

The AI Engine MUST support general-purpose interaction with application interfaces.

It SHOULD be capable of:

- Inspecting visual interfaces.
- Understanding interface structure.
- Identifying interactive elements.
- Executing touch and keyboard input.
- Performing gestures.
- Navigating between applications.
- Capturing and interpreting screenshots.
- Verifying action outcomes.
- Recovering from interaction failures.

Core computer-use capabilities MUST NOT depend exclusively on application-specific integrations or
APIs.

Application-specific integrations MAY be implemented as optional optimizations.

The architecture MUST account for applications that restrict automation or inspection.

### Principle 7 — AI-Native Interaction

The AI is the primary interaction layer of NexPhone.

The platform MUST prioritize intent-driven interaction over traditional application-centric
navigation.

- Users SHOULD be able to express intentions using natural language.
- The AI SHOULD determine the applications and capabilities required to fulfill those intentions.
- The system SHOULD present contextual interfaces based on the current task.
- Static navigation structures SHOULD NOT be mandatory for normal workflows.
- Voice and text interaction SHOULD be supported.
- Visual interfaces SHOULD appear when they provide meaningful interaction or information.

Dynamic interfaces MUST remain understandable, accessible and predictable.

The system MUST NOT sacrifice usability or user control merely to maximize automation.

### Principle 8 — Model Independence

The AI Engine MUST NOT be tightly coupled to a particular LLM provider, model or inference engine.

- Local models MUST be supported.
- External providers MAY be supported.
- Model providers MUST be replaceable through standardized interfaces.
- Provider-specific behavior MUST be isolated.
- Core orchestration logic SHOULD remain independent of model implementation details.

Ollama, llama.cpp and vLLM are potential inference implementations, not mandatory dependencies.

### Principle 9 — User Control and Action Authorization

The user MUST remain in control of consequential operations.

- Sensitive actions MUST require appropriate authorization.
- Financial transactions, account changes, message sending and irreversible operations MUST follow
  explicit authorization policies.
- The AI MUST distinguish between proposing an action and executing it.
- The system MUST communicate uncertainty when execution cannot be verified.
- Users MUST be able to inspect and revoke relevant permissions.
- Significant automated operations SHOULD be auditable.

Authorization policies MUST be enforced outside the LLM itself.

The AI MUST NOT be treated as a trusted security boundary.

### Principle 10 — Privacy and Security by Design

Security and privacy MUST be considered from the beginning of development.

- User environments MUST be isolated.
- Credentials MUST be protected.
- Network communication MUST be secured.
- Sensitive information MUST NOT be exposed unnecessarily to external providers.
- Host-system access MUST be restricted.
- Android instances MUST NOT receive unrestricted host privileges.
- Logs MUST avoid unnecessary sensitive information.
- Data retention MUST be transparent and configurable.

The system SHOULD minimize data collection and processing.

Local-first execution MUST NOT be treated as an automatic guarantee of security.

### Principle 11 — Persistent and Reliable Environments

A user's virtual Android environment MUST be persistent.

- Application data MUST survive normal restarts.
- User configuration MUST persist.
- Runtime lifecycle operations MUST be predictable.
- Failures MUST NOT silently destroy persistent user data.
- Backup and recovery mechanisms SHOULD be provided.
- Runtime health MUST be observable.

The AI Engine and Android Runtime SHOULD recover independently whenever possible.

### Principle 12 — Modular and Extensible Engineering

NexPhone MUST favor modularity and clearly defined responsibilities.

- Components MUST have explicit ownership and boundaries.
- Interfaces MUST be documented.
- Dependencies MUST be intentional.
- Components SHOULD be independently testable.
- New runtime implementations, models and client interfaces SHOULD be introducible without major
  architectural changes.

Avoid unnecessary abstractions.

Abstractions MUST solve an identified architectural problem rather than anticipate speculative
requirements.

### Principle 13 — Incremental and Testable Development

Development MUST proceed through small, verifiable increments.

- Every specification MUST have measurable acceptance criteria.
- Every implementation MUST have an appropriate testing strategy.
- Architectural decisions MUST be documented.
- Technical assumptions MUST be validated through prototypes when appropriate.
- Working software MUST take priority over speculative infrastructure.
- Implementation MUST NOT begin before essential requirements and acceptance criteria are
  sufficiently understood.

The project MUST NOT introduce distributed infrastructure, complex orchestration or unnecessary
services before the MVP demonstrates a need for them.

### Principle 14 — Interoperability and Standards

NexPhone SHOULD favor established protocols, formats and interfaces.

- APIs MUST be documented.
- Communication protocols SHOULD use established standards.
- Data formats SHOULD be portable.
- Integration contracts SHOULD avoid unnecessary vendor coupling.
- Components SHOULD remain independently replaceable.

Custom protocols SHOULD only be introduced when established alternatives are insufficient.

## Development Constraints

The initial MVP MUST prioritize:

1. Local installation on Linux.
2. A persistent Android runtime.
3. Direct application execution.
4. Runtime abstraction.
5. Remote interaction from a physical Android phone.
6. Screen streaming and input forwarding.

AI orchestration, general-purpose computer use, dynamic interfaces and persistent proactive
assistance SHOULD be introduced incrementally after the underlying execution environment is
functional.

The initial MVP MUST NOT require:

- Public cloud infrastructure.
- Kubernetes.
- Multiple Android instances.
- A custom Android distribution built from scratch.
- A custom LLM.
- Mandatory external APIs.
- Application-specific integrations for numerous applications.

These restrictions apply to initial scope, not necessarily to future capabilities.

## Architecture Decision Governance

Architectural decisions that affect subsystem boundaries, security, persistence, compatibility or
deployment MUST be documented as Architecture Decision Records (ADRs).

Every significant architectural change MUST:

1. Identify the problem.
2. Explain the available alternatives.
3. Document the selected approach.
4. Explain its consequences.
5. Identify any affected principles.

If an implementation conflicts with this constitution, the conflict MUST be explicitly identified
and resolved before proceeding.

## Spec-Driven Development Governance

GitHub Spec Kit MUST be used to guide product specification and implementation planning.

Specifications MUST:

- Follow this constitution.
- Describe observable system behavior.
- Separate functional and non-functional requirements.
- Include acceptance criteria.
- Identify dependencies and constraints.
- Address security and privacy.
- Define testing expectations.

Specifications MUST NOT silently override constitutional principles.

Constitutional changes require an explicit version update and documentation of the rationale.

## Definition of Project Success

NexPhone succeeds when a user can:

1. Install NexPhone on their own computer.
2. Run a persistent Android application environment locally.
3. Connect using an inexpensive physical phone.
4. Interact with applications remotely.
5. Delegate application workflows to an AI assistant.
6. Use natural language as the primary interface.
7. Retain control over their data and execution environment.
8. Operate the platform without mandatory external infrastructure.

**Ultimate principle:**

NexPhone exists to make applications subordinate to user intentions, with AI acting as the
intelligent interface between people and their digital environments.

## Governance

This constitution supersedes all other development practices, specifications and plans. Where any
of them conflict, this document prevails.

**Amendment procedure**

1. Propose the amendment in writing, stating the problem and the rationale.
2. Document the principle or section affected and the expected consequences.
3. Identify affected ADRs, specifications and implementations.
4. Record the change in the Sync Impact Report and update this document.
5. Obtain project-maintainer approval before the amendment takes effect.
6. Remove the temporary Sync Impact Report from this file before committing the amendment.

**Versioning policy**

This constitution uses semantic versioning.

- MAJOR: Backward-incompatible governance changes, including removal or redefinition of a
  principle or of a non-negotiable rule.
- MINOR: Addition of a principle or section, or materially expanded governance guidance.
- PATCH: Clarifications, wording improvements, typo fixes and other non-semantic refinements.

**Compliance review**

- Every pull request, review and specification MUST verify compliance with this constitution.
- Any deviation MUST be explicitly identified, justified and resolved before merge.
- Compliance verification MUST cover subsystem boundaries (Principle 3), runtime abstraction
  (Principle 4), authorization placement (Principle 9) and data persistence guarantees
  (Principle 11).
- Significant architectural decisions MUST be backed by an ADR as defined in Architecture Decision
  Governance.

**Version**: 1.0.0 | **Ratified**: 2026-11-09 | **Last Amended**: 2026-11-09
