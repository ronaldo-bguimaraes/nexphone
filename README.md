# NexPhone — Project Vision & Product Requirements

## 1. Project Identity

**Name:** NexPhone

**Repository:** `nexphone`

**Tagline:** Your phone. Reimagined by AI.

**Description:**

NexPhone is an open-source, self-hosted, AI-native personal computing platform. It provides persistent execution environments hosted on the user's own computer, accessed through thin terminals: phones, tablets, desktops, dedicated devices or future embedded hardware.

Instead of interacting with applications through their native interfaces, users express intentions. An agent interprets the intention, operates the application where necessary, and a UI Engine translates the observed application state into contextual interfaces. Applications do not need APIs, MCP servers or dedicated AI integrations.

Android is the first execution environment. It is not a permanent architectural boundary: the terminal and the agent must remain independent of it, and additional execution environments may be added behind the same contracts.

NexPhone aims to transform computing from an application-centric model into an AI-driven, intent-centric environment where humans and agents share the same persistent system.

## 2. Core Vision

Traditional smartphones require users to understand applications, navigate menus, switch between interfaces and manually execute workflows.

NexPhone proposes a different interaction model:

- The user expresses an intention.
- The AI understands the request.
- The AI determines which applications and capabilities are necessary.
- The AI operates those applications.
- The system presents relevant information through a contextual interface.
- The user remains in control of sensitive actions.

Applications remain important, but they are no longer the primary interaction interface. The
native application screen remains available as a fallback and as an explicit user choice.

**The AI becomes the primary interface to the user's digital environment.**

The platform supports three interaction modes: conversational, structured contextual UI, and native
application UI. The agent selects the most appropriate mode; the user can always override it.

## 3. Fundamental Architecture

NexPhone defines three fundamental roles. They are logical responsibilities, not necessarily three
separate processes.

- **Backend** — the persistent computing environment. It hosts execution environments, the agent
  runtime, the UI Engine, policy and persistent storage.
- **Terminal** — the user's access device. It displays generated interfaces, captures input,
  connects to the backend and optionally brokers physical capabilities.
- **Agent** — the intelligent operator. It interprets intentions, plans, acts, requests
  authorization and reports outcomes.

The existing three subsystems map onto these roles: the Android Runtime is an execution environment
inside the Backend, the AI Engine is the Agent runtime, and the Client is the Terminal. The full
reference architecture is in [`docs/architecture.md`](docs/architecture.md).

### 3.1. Backend — Execution Environments

Android is the first execution environment. The backend may host additional environments later
(Linux, browser) behind the same contract.

A virtual Android environment running on the user's computer.

Its responsibilities include:

- Running Android applications.
- Installing and updating applications.
- Managing application processes.
- Managing application data and persistent storage.
- Providing Android framework services.
- Managing application lifecycle.
- Rendering application interfaces.
- Supporting audio and networking.
- Exposing screen and input control capabilities.

The Android environment does not need a conventional launcher or traditional home screen.

It should be application-centric rather than smartphone-centric.

Applications should be launched directly when required.

The runtime must retain all Android framework components necessary for application compatibility.

Initially, investigate Redroid as the foundation. A customized AOSP-based runtime may be considered later.

### 3.2. Agent — AI Engine

The intelligence layer is responsible for understanding and executing user intentions. It is hosted
by the backend but remains independent of the execution environment and of specific model
providers.

Its responsibilities include:

- Natural language understanding.
- Task planning.
- Multi-step execution.
- Application discovery.
- Computer-use automation.
- Visual interface understanding.
- Context management.
- Persistent memory.
- Voice interaction.
- Tool orchestration.
- Error detection and recovery.
- Proactive assistance.

The agent must be able to interact through an application's actual interface when no reliable API or integration exists, rather than depending exclusively on application-specific APIs.

The system should support general-purpose computer use:

- Inspect application interfaces.
- Identify interactive elements.
- Tap and click.
- Type text.
- Scroll.
- Swipe.
- Navigate between applications.
- Capture screenshots.
- Interpret visual content.
- Verify execution results.

The AI must not be hardcoded for WhatsApp, Instagram or other specific applications.

It should operate applications through reusable interaction capabilities.

### 3.3. Terminal — Client Application

The terminal is a thin access device. The current implementation is a mobile web client; phones,
tablets, desktops, dedicated terminals and future embedded devices are valid terminals.

The terminal must not be tightly coupled to Android as its execution environment.

In the M0 terminal, the user opens only the NexPhone web client.

They do not need to install WhatsApp, Instagram or other applications on their physical device.

The client provides:

- Voice interaction.
- Text interaction.
- Authentication.
- Connection management.
- Notifications.
- Contextual interfaces.
- Remote screen visualization when necessary.
- Audio streaming.
- Touch and keyboard input.
- Session management.

The terminal should work on relatively inexpensive devices, including older Android phones.

The terminal should not need to execute the Android applications hosted by NexPhone.

### 3.4. UI Engine

The UI Engine makes ordinary applications usable through generated interfaces. It is a backend
component with four responsibilities:

- **Observer**: accessibility events, window information, hierarchies and, only when necessary,
  screenshots.
- **State Interpreter**: normalized application state, using deterministic rules first, semantic
  model assistance second, and visual interpretation only as an experimental fallback.
- **UI Generator**: contextual forms, lists, cards, selectors, confirmations and progress views.
  Ordinary rendering does not require an LLM.
- **Action Mapper**: translates terminal interactions into validated actions against the real
  application, tied to the observed state version.

The native application screen remains available as a fallback and explicit user choice.

See [`docs/ui-engine.md`](docs/ui-engine.md) and
[ADR-0004](docs/adr/0004-intent-driven-ui-engine.md).

### 3.5. Device Bridge

The Device Bridge is an optional component that connects physical terminal capabilities to the
backend: location, camera, microphone, audio output, notifications, clipboard, files, device status
and sensors.

The terminal is a source of capabilities, not the host of the computing environment. Capabilities
are requested with a purpose, granted per request, revocable and auditable. The execution
environment never receives direct access to terminal hardware.

See [`docs/device-bridge.md`](docs/device-bridge.md) and
[ADR-0006](docs/adr/0006-device-bridge.md).

## 4. Deployment Model: Local-First

The initial deployment target is the user's personal computer running Ubuntu or another supported Linux distribution.

The computer hosts:

- Android runtime.
- AI orchestration backend.
- Local inference server.
- Persistent storage.
- Database.
- Communication services.
- Application management.
- Session management.

The terminal connects to the computer over the local network. A phone is the initial terminal, not a
permanent constraint.

Example:

    PERSONAL COMPUTER
    Ubuntu / Linux
          |
          +-- Backend API / session / policy
          |
          +-- Agent runtime (optional local LLM)
          |
          +-- UI Engine (observe, interpret, generate, map)
          |
          +-- Execution environments (Android first)
          |
          +-- Persistent storage
          |
          +-- Streaming server
                    |
                Wi-Fi / LAN
                    |
                 TERMINAL
        phone / tablet / desktop
             NexPhone client

Remote access from outside the local network can be implemented later through secure networking solutions.

The architecture should also permit future multi-user and server deployments.

**No mandatory cloud infrastructure.**

External services and commercial LLM providers must remain optional.

## 5. Android Runtime: Application-Centric Environment

NexPhone does not need to provide users with a complete traditional smartphone experience.

The virtual Android environment should be optimized for application execution.

A conventional launcher, home screen and unnecessary system applications are not required.

The runtime should provide only what is necessary to execute applications reliably.

However, removing unnecessary components must not compromise Android framework compatibility.

Some applications may depend on:

- Google Play Services.
- Device-specific services.
- Hardware-backed security.
- Device integrity verification.
- Particular Android system components.
- Camera, microphone or other hardware capabilities.

These dependencies must be evaluated individually.

The runtime should expose a standardized interface for:

- Creating instances.
- Starting instances.
- Stopping instances.
- Installing applications.
- Launching applications.
- Terminating applications.
- Managing persistent storage.
- Capturing screenshots.
- Sending input events.
- Streaming rendered output.
- Monitoring runtime health.

## 6. Architectural Independence

A fundamental architectural decision:

**The execution environment must be independent of the Agent, the UI Engine and the Terminal.**

The Agent must not depend directly on Redroid-specific implementation details.

Introduce an execution-environment abstraction.

Conceptual architecture:

    TERMINAL (phone, tablet, desktop, dedicated device)
       |  chat | generated UI | native view | Device Bridge
       |
    BACKEND API / SESSION / POLICY
       |
       +-- AGENT (planning, execution, memory)
       |
       +-- UI ENGINE (observe -> interpret -> generate -> map actions)
       |
    EXECUTION-ENVIRONMENT CONTRACT
       |
       +-- Android adapter (Redroid, provisional)
       +-- Future Linux adapter
       +-- Future browser adapter
       |
    APPLICATIONS

The abstraction must provide standardized lifecycle, capability, application, screen, input and
storage operations.

This allows:

- Replacing Redroid without rewriting the Agent or Terminal.
- Introducing a customized AOSP implementation.
- Supporting multiple execution environments.
- Testing the Agent and UI Engine independently.
- Running different environment implementations.

The same architectural independence applies to LLM providers, terminals and application
integration mechanisms.

See [ADR-0008](docs/adr/0008-execution-environment-independence.md) and
[ADR-0009](docs/adr/0009-terminal-independence.md).

## 7. AI-Native User Interface

NexPhone should not be another traditional smartphone launcher.

Its primary interface is conversational.

Users should be able to express intentions naturally.

Examples:

**Example 1: Messaging**

User:

"Tell Rayza I'll be 20 minutes late."

Expected behavior:

1. Identify the intended contact.
2. Open WhatsApp in the virtual Android environment.
3. Find the relevant conversation.
4. Prepare the message.
5. Present a contextual preview.
6. Request confirmation when appropriate.
7. Send the message.
8. Verify the result.

**Example 2: Information retrieval**

User:

"Find the conversation where someone sent me an invoice last week."

Expected behavior:

1. Identify relevant applications.
2. Search available conversation content.
3. Navigate application interfaces.
4. Identify potential matches.
5. Present relevant results.

**Example 3: Daily organization**

User:

"Organize my afternoon."

Expected behavior:

1. Gather relevant information.
2. Identify commitments and tasks.
3. Prepare a proposed schedule.
4. Present an interactive contextual interface.

### Dynamic interfaces

The system must not rely on a rigid interface for every operation.

Interfaces should adapt to the user's intentions.

Examples:

- Conversation cards.
- Message previews.
- Contact selection.
- Search results.
- Interactive dashboards.
- Forms.
- Document previews.
- Charts.
- Task lists.
- Voice responses.

Sometimes no visual interface is necessary.

The system should generate only the interface needed for the current interaction.

### Intent-driven interface architecture

The UI Engine observes an application, normalizes its state, generates a declarative interface and
maps terminal actions back to the real application. It is deterministic first:

1. Accessibility hierarchy and rules (no model inference).
2. Semantic interpretation (LLM) when the structure is unfamiliar or ambiguous.
3. Visual interpretation (vision) only when accessibility is insufficient.
4. Native UI mode when the state cannot be represented safely.

A screenshot-to-LLM-to-click loop is not the default mechanism. Generated interfaces are
regenerated only when relevant state changes, not when local form values change.

Proposed engineering targets, pending measurement: render an existing interface under 100 ms,
local input under 50 ms, deterministic interpretation under 300 ms and semantic interpretation under
2 seconds. These are hypotheses, not guarantees.

See [`docs/ui-engine.md`](docs/ui-engine.md),
[`docs/interaction-modes.md`](docs/interaction-modes.md) and
[ADR-0005](docs/adr/0005-deterministic-first.md).

## 8. General-Purpose Computer Use

Application interaction should be based on general-purpose computer-use capabilities.

Potential mechanisms:

- Screenshot capture.
- Visual understanding.
- Accessibility information where available.
- UI hierarchy inspection.
- Touch simulation.
- Keyboard input.
- Gesture execution.
- Application lifecycle management.

The AI should be able to operate unfamiliar applications without requiring a custom integration for every application.

Application-specific integrations may exist as optional optimizations, but they must not be architectural requirements.

The platform should select the most reliable available mechanism for each operation:

1. Native API or documented integration.
2. MCP server or equivalent interoperability interface.
3. Accessibility-based interaction.
4. Visual automation.
5. Native UI mode for the user.

MCP is an optional interoperability interface, not the foundation of the architecture.

The platform must respect application security boundaries and must not assume that every application permits unrestricted automation.

## 9. Voice and 24/7 Assistant

The long-term objective is a persistent personal assistant.

Expected capabilities:

- Voice input.
- Speech recognition.
- Natural voice responses.
- Conversational continuity.
- Persistent memory.
- Background task execution.
- Proactive notifications.
- Long-running workflows.
- Scheduled operations.

The assistant should have multiple interaction modes:

1. On-demand: the user explicitly requests assistance.
2. Proactive: the assistant identifies relevant events and notifies the user.
3. Autonomous: the assistant executes workflows within an explicitly authorized scope.

Autonomous behavior never bypasses the Read/Act/Commit model. Commit actions always require explicit
authorization, even during background execution.

A persistent assistant does not necessarily require continuous microphone recording.

Background execution and audio capture must be designed with privacy, security and operating-system constraints in mind.

## 10. Open-Source and Self-Hosted Principles

NexPhone must be:

- Open source.
- Self-hostable.
- Local-first.
- Modular.
- Extensible.
- Model-independent.
- Execution-environment-independent.
- Terminal-independent.
- Application-independent.

Users should be able to operate the platform without mandatory subscriptions or external services.

External LLM providers may be supported as optional integrations.

Local inference should be supported through compatible inference engines.

Potential technologies to investigate:

- Ollama.
- llama.cpp.
- vLLM.

The project should favor established open-source components instead of unnecessarily implementing existing infrastructure.

All dependencies must undergo license and compatibility evaluation.

## 11. Technology Choices and Candidates

These are current provisional choices and candidates, not permanent architectural commitments.

| Component | Current M0 choice | Candidates to evaluate |
|---|---|---|
| Android runtime | Redroid (provisional) | Customized AOSP, Cuttlefish, other Android-in-container runtimes |
| Backend | Node.js 24 + TypeScript + Fastify | Python/FastAPI, Go |
| Terminal | React web client | Native Android, desktop, dedicated terminal |
| Streaming | scrcpy H.264 + WebCodecs | WebRTC, MSE/fMP4 |
| UI interpretation | Deterministic accessibility rules (M1) | Semantic LLM, visual/vision fallback |
| Agent orchestration | Not implemented | Graph-based, model-driven, hybrid |
| Local inference | Not implemented | Ollama, llama.cpp, vLLM |
| State | SQLite | PostgreSQL, pgvector for semantic retrieval |
| Deployment | Docker Compose | Podman Compose, systemd |
| Local networking | LAN | WireGuard, Tailscale |

Technology selection must be validated through prototypes and technical specifications. The M0
choice is not a mandate for future milestones.

## 12. Repository Structure

The current repository is intentionally smaller than the long-term component map:

    nexphone/
    ├── backend/          # gateway, runtime adapters, auth, storage, CLI
    ├── client/           # web terminal (pairing, native screen, input)
    ├── deploy/           # Compose, Caddy, preflight and operation scripts
    ├── config/           # example deployment configuration
    ├── docs/             # architecture, UI Engine, Device Bridge, ADRs
    ├── specs/            # Spec Kit feature specifications and plans
    ├── .specify/         # constitution, templates and workflows
    ├── .github/          # CI and issue templates
    └── README.md

Future components are added behind existing contracts rather than by restructuring the whole
repository:

- `backend/src/ui-engine/` — observer, interpreter, generator, action mapper (M1).
- `backend/src/agent/` — planning, execution, memory, provider adapters (M2).
- `backend/src/device-bridge/` — capability broker (M3).
- Additional terminal renderers under `client/` or separate terminal packages (M4).
- Additional execution-environment adapters under `backend/src/runtime/` (M4).

This structure is provisional and must evolve through architecture specifications and ADRs.

## 13. Development Roadmap

The maintained roadmap, component classification and exit criteria are in
[`docs/roadmap.md`](docs/roadmap.md). Summary:

### M0 — Local execution foundation (delivered)

- Ubuntu-hosted Android runtime, application install/launch/stop and persistent data.
- Phone pairing, screen streaming and input over the LAN.
- Versioned runtime adapter contract and isolation gate.
- Native UI mode only.

Outstanding: real Redroid isolation and boot validation on a KVM + binder host.

### M1 — Deterministic intent interfaces (next MVP)

- Accessibility observer, deterministic state interpreter, standard UI generator and action mapper.
- Minimal intent router for scripted workflows, Read/Act policy and audit records.
- Native fallback in one explicit action.

Exit: a phone/OTP workflow completed through generated interfaces with no LLM in the loop.

### M2 — Agent and semantic interpretation

- Agent planner/executor, provider-neutral inference and Level 2 semantic interpretation.
- Conversational mode, mode selection and Commit authorization.

### M3 — Device Bridge

- Consent-bound location, notifications and clipboard access.
- Mock-location limitations validated; no integrity bypass.

### M4 — Multiple environments and terminals

- Execution-environment registry, a second environment, multiple instances and cross-terminal
  handoff.

### M5 — Experimental visual fallback and richer UI

- Visual interpretation, custom-rendered applications, richer components and preference learning.

### M6 — Persistent proactive assistant

- Memory, scheduling, background tasks and proactive notifications.

The vision MVP is M0 + M1. M2 makes the experience conversational and general. See the roadmap for
the component classification and per-milestone exit criteria.

## 14. Security and Privacy

Security is a foundational requirement.

The system must consider:

- Isolation between users.
- Isolation between Android instances.
- Authentication.
- Secure communication.
- Persistent data protection.
- Credential management.
- AI tool permissions.
- Confirmation of sensitive operations.
- Audit logs.
- Explicit microphone and camera controls.

Applications must not automatically gain unrestricted access to host resources.

The AI must not have unrestricted access to the host computer merely because it controls a virtual Android instance.

### Authorization levels

NexPhone distinguishes three permission levels:

- **Read** — inspect application information and retrieve data.
- **Act** — navigate, fill forms, send messages and modify application state.
- **Commit** — perform consequential or irreversible actions such as purchases, bookings, ride
  requests, account changes or financial transactions.

Commit actions require explicit, informed user authorization and default to deny. Authorization is
enforced by the backend outside the LLM. Passwords, OTPs and private application data must not be
exposed to model providers unnecessarily. Significant automated operations should be auditable.

See [`docs/authorization.md`](docs/authorization.md).

## 15. Non-Goals for the Initial MVP

Avoid implementing these prematurely:

- A complete replacement for Android on physical phones.
- A custom Android distribution from scratch.
- Public multi-tenant cloud infrastructure.
- Kubernetes or distributed orchestration.
- A custom LLM.
- A custom inference engine.
- Application-specific integrations for dozens of services.
- An advanced dynamic interface before remote interaction works.
- MCP as a prerequisite for core functionality.
- A specific terminal platform or a terminal that must run Android.
- A specific LLM provider or mandatory model inference.
- Mandatory external cloud services.
- Commercial subscription infrastructure.

The first priority is a functional local prototype.

## 16. Architectural Decisions

The maintained Architecture Decision Record log is in [`docs/adr/`](docs/adr/README.md). It is the
source of truth; this section only summarizes the decisions that shape the product.

| Decision | Recorded in |
| --- | --- |
| Runtime and agent independence | [ADR-0002](docs/adr/0002-runtime-adapter-contract.md), Constitution Principle 3 |
| Local-first deployment | Constitution Principle 2 |
| Thin, Android-independent terminal | [ADR-0009](docs/adr/0009-terminal-independence.md) |
| Application-centric Android environment | Constitution Principle 5 |
| General-purpose computer use | Constitution Principle 6 |
| Intent-driven UI Engine | [ADR-0004](docs/adr/0004-intent-driven-ui-engine.md) |
| Deterministic-first interpretation | [ADR-0005](docs/adr/0005-deterministic-first.md) |
| Adaptive interaction modes | [ADR-0004](docs/adr/0004-intent-driven-ui-engine.md), `docs/interaction-modes.md` |
| Device Bridge as capability broker | [ADR-0006](docs/adr/0006-device-bridge.md) |
| Application mechanism priority | [ADR-0007](docs/adr/0007-integration-mechanism-priority.md) |
| Execution environment independence | [ADR-0008](docs/adr/0008-execution-environment-independence.md) |
| Open source and self-hosting | Constitution Principles 1–2 |
| Modular, replaceable technology choices | [ADR-0002](docs/adr/0002-runtime-adapter-contract.md), Constitution Principle 12 |

New significant decisions require an ADR. Do not renumber existing records; supersede them.

## 17. Open Questions

The maintained list, including validation methods and milestone ownership, is in
[`docs/open-questions.md`](docs/open-questions.md). It covers:

- Accessibility behavior and hierarchy quality inside the provisional runtime.
- Deterministic interpretation coverage and normalized-schema expressiveness.
- Semantic and visual interpretation reliability, cost and privacy.
- Mock-location and device-capability limitations.
- Execution-environment and terminal independence.
- Multi-environment isolation and cross-terminal handoff.
- Read/Act/Commit classification and prompt-injection resistance.
- Per-stage performance measurements.

These questions must be resolved by prototypes and measurements, not assumptions. Unresolved items
are not silently dropped.

## 18. Instructions for GitHub Spec Kit

Use this document as the foundational product vision.

Generate the project constitution before implementation specifications.

The constitution must preserve the architectural principles and non-negotiable decisions established here.

Do not assume that every proposed technology must be adopted.

Research technical feasibility where necessary.

Prefer small, independently testable specifications.

Prioritize a functional local prototype over comprehensive infrastructure.

Every implementation specification should include:

- User stories.
- Functional requirements.
- Non-functional requirements.
- Acceptance criteria.
- Dependencies.
- Technical constraints.
- Security considerations.
- Testing strategy.
- The interaction mode(s) involved and whether native fallback is required.
- The Read/Act/Commit permission levels of every action.
- The interpretation level used (deterministic, semantic or visual).
- Whether an LLM is required, optional or forbidden for the flow.
- How sensitive data is kept out of model prompts and logs.
- Terminal and execution-environment assumptions.

Do not introduce unnecessary abstractions, infrastructure or complexity.

Prefer deterministic implementations before model-dependent ones.

Preserve the independence between execution environments, the Agent, the UI Engine and the
Terminal.

The ultimate objective is not to build another Android emulator, chatbot or remote desktop.

**The objective is to build an open-source, self-hosted personal computing environment where AI is the primary interface to applications and digital services.**

---

## Repository status

This repository currently implements the **M0 foundation**: a local Android runtime, a gateway, a
web terminal, and the contracts that keep them replaceable. The UI Engine, Agent, Device Bridge,
voice interaction and autonomous workflows are deliberately not implemented yet. Their absence must
not be represented as completed product capability.

| Area | Location |
| --- | --- |
| Constitution (v1.2.0) | `.specify/memory/constitution.md` |
| Reference architecture | `docs/architecture.md` |
| UI Engine specification | `docs/ui-engine.md` |
| Interaction modes | `docs/interaction-modes.md` |
| Device Bridge specification | `docs/device-bridge.md` |
| Authorization model | `docs/authorization.md` |
| Roadmap and MVP definition | `docs/roadmap.md` |
| Open questions | `docs/open-questions.md` |
| M0 specification | `specs/001-local-android-environment/spec.md` |
| Plan and research | `specs/001-local-android-environment/plan.md`, `research.md` |
| Contracts | `specs/001-local-android-environment/contracts/` |
| Tasks | `specs/001-local-android-environment/tasks.md` |
| Backend gateway | `backend/src/` |
| Web terminal | `client/src/` |
| Deployment | `deploy/` and `docs/deployment.md` |
| Operations | `docs/operations.md` |
| Architecture decisions | `docs/adr/` |

**Next milestone**: M1 — deterministic intent interfaces. It introduces the UI Engine and proves
that a real workflow can be completed through generated interfaces without an LLM in the rendering
path. See `docs/roadmap.md`.

### Run it locally

Prerequisites: Ubuntu 24.04 LTS, Docker Engine with Compose v2, KVM, Android binder, and a phone on
the same LAN.

```bash
cp deploy/.env.example deploy/.env
cp config/nexphone.example.yaml config/nexphone.yaml
./deploy/scripts/pin-image.sh redroid/redroid:14.0.0_64only-latest
./deploy/scripts/preflight.sh
./deploy/scripts/up.sh
```

Then start and pair:

```bash
export NEXPHONE_URL=https://localhost:8443
export NEXPHONE_OPERATOR_TOKEN=$(
  docker compose --env-file deploy/.env -f deploy/compose.yaml \
    exec -T gateway cat /state/operator-token | tr -d '\r\n'
)
npm run cli -w backend -- runtime start
npm run cli -w backend -- pair
```

See `docs/deployment.md` for the full procedure and `docs/validation/m0-results.md` for the current
verification status.

### Develop

```bash
npm install
npm run typecheck
npm run test:unit
npm run lint
```

Integration tests require a KVM + binder host and a pinned runtime image:

```bash
NEXPHONE_INTEGRATION=1 npm run test:integration -w backend
```

See `CONTRIBUTING.md` for the contribution workflow and `docs/adapter-guide.md` for implementing an
alternative Android runtime.
