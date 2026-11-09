# Roadmap and MVP Definition

**Status**: Proposed. M0 is implemented; M1 is the next increment.
**Related**: [Architecture](architecture.md), [UI Engine](ui-engine.md),
[Open questions](open-questions.md).

The roadmap keeps the constitution's incremental rule: each milestone must be independently
demonstrable, testable and useful. It does not require the full vision before shipping value.

## 1. What M0 delivered

**Goal**: a persistent local Android environment usable from a phone.

Delivered in this repository:

- Ubuntu-hosted Android runtime with a documented lifecycle.
- Application install, launch, stop and persistent data.
- Phone pairing, screen streaming and input over the LAN.
- Versioned runtime adapter contract with a fake adapter and boundary test.
- Runtime isolation that refuses privileged containers.
- Structured status, errors and redacted logs.
- Deployment documentation and a Docker image.

**Outstanding gate**: the real Redroid isolation and boot check on a KVM + binder host. The code
never uses `--privileged`; whether the provisional runtime works with the restricted capability set
is still unverified (ADR-0003). M0 is not fully accepted until that gate passes.

## 2. Milestones

### M1 — Deterministic intent interfaces (next MVP)

**Goal**: complete a real application workflow through generated interfaces, without an LLM in the
rendering path.

Deliverables:

- UI Observer over Android accessibility.
- Deterministic State Interpreter for common forms, lists and confirmations.
- UI Generator for the standard component set.
- Action Mapper with state-version validation.
- Minimal intent router for a small set of scripted workflows.
- Read/Act policy and audit records.
- Native-mode fallback in one action.

Exit criteria:

- A phone-number/OTP workflow is completed through generated forms.
- The same workflow works with LLM inference disabled.
- Stale actions are rejected; secrets are absent from logs and prompts.
- Native mode remains available and an unsupported screen falls back safely.

### M2 — Agent and semantic interpretation

**Goal**: the user expresses an intention in natural language and the agent executes it.

Deliverables:

- Agent runtime: intent parsing, planning, execution, verification.
- Provider-neutral inference interface; local models supported.
- Level 2 semantic interpretation with schema validation.
- Conversational mode and mode selection.
- Commit authorization with explicit confirmation and receipts.
- Task state that survives terminal reconnects.

Exit criteria:

- The agent performs a multi-step workflow in an application it was not specifically programmed for.
- A Commit action cannot execute without confirmation.
- An injected instruction cannot bypass policy.
- The agent reports unverified outcomes honestly.

### M3 — Device Bridge

**Goal**: use physical terminal capabilities where the execution environment lacks them.

Deliverables:

- Capability registration, consent and revocation.
- Location read, notifications and clipboard read/write.
- Mock-location limitations validated.
- Audit records without raw values.

Exit criteria:

- A location-dependent workflow uses a consented terminal value.
- Denial and revocation work immediately.
- Mock-location rejection is reported accurately.

### M4 — Multiple environments and terminals

**Goal**: treat environments and terminals as independent resources.

Deliverables:

- Execution-environment registry and a second environment (Linux or browser).
- Multiple Android instances with resource limits.
- Start a task on one terminal and continue on another.
- Environment-scoped permissions and data isolation.

Exit criteria:

- Two environments run concurrently without state leakage.
- A session resumes on a second terminal with application state intact.
- The agent and UI Engine work across environments through the contract.

### M5 — Experimental interpretation and richer interfaces

**Goal**: extend coverage without weakening the deterministic default.

Deliverables:

- Level 3 visual interpretation with sensitive-region masking.
- Custom-rendered and canvas-heavy application support.
- Charts, maps, document previews and multi-step wizards.
- Preference learning for recommendation use cases, with explicit feedback.

Exit criteria:

- Visual fallback improves coverage on a measured test set without unacceptable cost.
- Users can see which interpretation level was used and fall back to native mode.
- Recommendation features never perform autonomous interpersonal actions.

### M6 — Persistent assistant

**Goal**: proactive, scheduled and background assistance.

Deliverables:

- Persistent memory with retention controls.
- Scheduled and background tasks.
- Notifications and proactive suggestions.
- Permission and authorization management across tasks.

Exit criteria:

- The assistant resumes work after restarts.
- Users can inspect and revoke memory and permissions.
- Background work is visible and bounded.

## 3. MVP definition

The **vision MVP** is M0 + M1, with a minimal intent router. It proves that a user can:

1. run a persistent application environment locally;
2. access it from a non-Android-coupled terminal;
3. complete a real workflow through a generated interface;
4. fall back to the native screen;
5. keep secrets out of the model path;
6. authorize only consequential actions.

M2 makes the experience conversational and general. It is the next product milestone, not a
prerequisite for proving the core idea.

## 4. Component classification

| Component | Classification |
| --- | --- |
| Android runtime + persistence | M0 — delivered |
| Native screen streaming and input | M0 — delivered |
| Runtime adapter contract | M0 — delivered |
| Terminal pairing and session auth | M0 — delivered |
| Accessibility UI Observer | MVP (M1) |
| Deterministic State Interpreter | MVP (M1) |
| Standard UI Generator | MVP (M1) |
| Action Mapper | MVP (M1) |
| Minimal intent router | MVP (M1) |
| Read/Act policy and audit | MVP (M1) |
| Agent planner/executor | MVP (M2) |
| Semantic interpretation | MVP (M2) |
| Conversational mode | MVP (M2) |
| Commit authorization | MVP (M2) |
| Device Bridge | Future (M3) |
| Multiple environments | Future (M4) |
| Second execution environment (Linux/browser) | Future (M4) |
| Cross-terminal handoff | Future (M4) |
| Visual interpretation | Experimental (M5) |
| Richer generated components | Future (M5) |
| Preference learning | Experimental (M5) |
| Proactive persistent assistant | Future (M6) |
| Voice interaction | Future |
| MCP interoperability | Future, optional |

## 5. Sequencing rules

- M1 must not require an LLM, a model provider or MCP.
- M2 must not change the runtime adapter contract in a breaking way.
- M3 must not grant device capabilities without consent.
- M4 must not require a distributed deployment.
- M5 must not become the default path.
- Every milestone must preserve native mode and Read/Act/Commit enforcement.

## 6. What is intentionally deferred

- A custom Android distribution.
- A custom LLM or inference engine.
- Multi-tenant cloud infrastructure.
- Kubernetes.
- Application-specific integrations at scale.
- Autonomous interpersonal actions on social platforms.
- Guaranteed compatibility with applications that enforce device integrity.
