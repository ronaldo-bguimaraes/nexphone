# NexPhone — Project Vision & Product Requirements

## 1. Project Identity

**Name:** NexPhone

**Repository:** `nexphone`

**Tagline:** Your phone. Reimagined by AI.

**Description:**

NexPhone is an open-source, self-hosted, AI-native virtual phone platform. It provides users with a persistent Android environment hosted on their own computers, accessible through inexpensive physical devices acting as thin clients.

Instead of interacting with applications through traditional interfaces, users primarily interact with an intelligent assistant that understands their intentions, operates applications and dynamically presents contextual interfaces.

NexPhone aims to transform the smartphone experience from an application-centric model into an AI-driven, intent-centric computing environment.

## 2. Core Vision

Traditional smartphones require users to understand applications, navigate menus, switch between interfaces and manually execute workflows.

NexPhone proposes a different interaction model:

- The user expresses an intention.
- The AI understands the request.
- The AI determines which applications and capabilities are necessary.
- The AI operates those applications.
- The system presents relevant information through a contextual interface.
- The user remains in control of sensitive actions.

Applications remain important, but they are no longer the primary interaction interface.

**The AI becomes the primary interface to the user's digital environment.**

## 3. Fundamental Architecture

NexPhone consists of three independent core subsystems.

### 3.1. Android Runtime

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

### 3.2. AI Engine

The intelligence layer is responsible for understanding and executing user intentions.

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

The AI must interact with applications through their actual interfaces whenever appropriate, rather than depending exclusively on application-specific APIs.

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

### 3.3. Client Application

The physical smartphone acts as a thin client.

The user installs only the NexPhone application.

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

The client should work on relatively inexpensive Android devices.

The physical phone should not need to execute the Android applications hosted by NexPhone.

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

The physical phone connects to the computer over the local network.

Example:

    PERSONAL COMPUTER
    Ubuntu / Linux
          |
          +-- Android Runtime
          |
          +-- AI Engine
          |
          +-- Local LLM
          |
          +-- Backend API
          |
          +-- Persistent Storage
          |
          +-- Streaming Server
                    |
                Wi-Fi / LAN
                    |
              PHYSICAL PHONE
                 NexPhone
                Thin Client

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

**The Android Runtime must be independent of the AI Engine.**

The AI must not depend directly on Redroid-specific implementation details.

Introduce a Runtime Abstraction Layer.

Conceptual architecture:

    MOBILE CLIENT
          |
       BACKEND API
          |
     AI ORCHESTRATOR
          |
    RUNTIME ABSTRACTION
          |
       +--+----------+
       |             |
    Redroid       Future AOSP
    Adapter        Adapter
       |             |
       +------+------+
              |
       Android Applications

The runtime abstraction must provide standardized operations and capabilities.

This allows:

- Replacing Redroid without rewriting the AI Engine.
- Introducing a customized AOSP implementation.
- Supporting multiple runtime providers.
- Testing the AI Engine independently.
- Running different runtime implementations.

The same architectural independence should apply to LLM providers and the mobile client.

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
3. Autonomous: the assistant executes authorized workflows.

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
- Runtime-independent.
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

## 11. Initial Technology Candidates

These are candidates for investigation, not mandatory architectural commitments.

| Component | Candidate |
|---|---|
| Android runtime | Redroid |
| Android customization | AOSP |
| Backend | Python + FastAPI |
| AI orchestration | LangGraph |
| Local inference | Ollama / llama.cpp |
| Database | PostgreSQL |
| Vector search | pgvector |
| Streaming | WebRTC |
| Remote interaction | Android UI automation |
| Deployment | Docker Compose |
| Mobile client | Kotlin / Jetpack Compose |
| Local networking | LAN initially; WireGuard or Tailscale later |

Technology selection must be validated through prototypes and technical specifications.

## 12. Proposed Repository Structure

    nexphone/
    |
    +-- apps/
    |   +-- mobile-client/
    |   +-- web-console/
    |
    +-- android/
    |   +-- base-image/
    |   +-- system-services/
    |   +-- ai-system-agent/
    |
    +-- runtime/
    |   +-- runtime-abstraction/
    |   +-- redroid-adapter/
    |   +-- lifecycle/
    |   +-- storage/
    |   +-- streaming/
    |
    +-- intelligence/
    |   +-- orchestrator/
    |   +-- computer-use/
    |   +-- memory/
    |   +-- tools/
    |   +-- inference/
    |
    +-- platform/
    |   +-- api/
    |   +-- authentication/
    |   +-- networking/
    |
    +-- infrastructure/
    |   +-- docker/
    |   +-- local-deployment/
    |
    +-- docs/
    |   +-- architecture/
    |   +-- decisions/
    |
    +-- README.md

This structure is provisional and should be refined through architecture specifications.

## 13. Development Roadmap

Development should proceed incrementally.

### M0 — Local Infrastructure

Goal: Establish a working local installation.

Deliverables:

- Repository foundation.
- Local deployment configuration.
- Backend skeleton.
- Android runtime prototype.
- Basic runtime lifecycle management.

Acceptance criteria:

- NexPhone can be started locally.
- An Android instance can be created.
- The instance remains available across service restarts.
- Runtime health can be inspected.

### M1 — Application Execution

Goal: Run Android applications without a conventional launcher.

Deliverables:

- Application installation.
- Application discovery.
- Direct application launching.
- Process management.
- Persistent application data.

Acceptance criteria:

- An application can be installed and launched.
- Its interface can be captured.
- Its data survives runtime restarts.

### M2 — Remote Thin Client

Goal: Access the virtual Android environment from a physical phone.

Deliverables:

- Mobile client.
- Authentication.
- Local network communication.
- Screen streaming.
- Touch and keyboard forwarding.

Acceptance criteria:

- The phone connects to the computer.
- The user can see the remote application.
- The user can interact with it.
- Interaction latency is measured.

### M3 — Runtime Abstraction

Goal: Decouple the backend from the Android implementation.

Deliverables:

- Runtime interface.
- Redroid adapter.
- Instance lifecycle API.
- Runtime capability discovery.
- Automated integration tests.

Acceptance criteria:

- The backend interacts with Android exclusively through the runtime abstraction.
- Runtime implementation details do not leak into the AI Engine.

### M4 — AI Orchestration

Goal: Introduce the personal assistant.

Deliverables:

- Natural language interface.
- Task planning.
- Tool execution.
- Context management.
- Local LLM integration.

Acceptance criteria:

- The assistant can interpret basic intentions.
- It can launch applications.
- It can execute multi-step operations.

### M5 — Computer Use

Goal: Allow AI to operate arbitrary applications.

Deliverables:

- Screen understanding.
- UI inspection.
- Touch and keyboard control.
- Gesture execution.
- Execution verification.
- Error recovery.

Acceptance criteria:

- The assistant can perform a basic workflow in an application it was not specifically programmed to integrate with.

### M6 — AI-Native Interface

Goal: Replace rigid navigation with contextual interaction.

Deliverables:

- Dynamic interface components.
- Contextual cards.
- Interactive previews.
- Voice interaction.
- Conversational continuity.

### M7 — Persistent Personal Assistant

Goal: Make the assistant continuously available.

Deliverables:

- Persistent memory.
- Background execution.
- Notifications.
- Scheduled workflows.
- Proactive assistance.
- Permission and authorization management.

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
- Mandatory external cloud services.
- Commercial subscription infrastructure.

The first priority is a functional local prototype.

## 16. Architectural Decisions Already Established

### ADR-001: Runtime and AI Independence

The Android runtime must be independent of AI orchestration.

### ADR-002: Local-First Deployment

The initial platform runs on the user's own computer.

### ADR-003: Thin Client

The physical phone only needs the NexPhone client. Android applications run remotely.

### ADR-004: Application-Centric Android

The virtual Android environment does not require a conventional launcher or home screen.

### ADR-005: General-Purpose Computer Use

The AI must interact with arbitrary applications through reusable computer-use capabilities, not depend exclusively on application-specific APIs.

### ADR-006: AI-Native Interface

The AI is the primary interaction layer. Interfaces are contextual and dynamically presented.

### ADR-007: Open Source

The complete platform should be open source and self-hostable, without mandatory commercial dependencies.

### ADR-008: Modular Technology Choices

Redroid, LangGraph, Ollama and other technologies are implementation candidates, not permanent architectural dependencies.

## 17. Open Questions for Spec Kit

These questions require investigation and should not be resolved through unsupported assumptions.

1. Can Redroid provide the required application execution environment without a conventional launcher?
2. Which Android system services are essential for application compatibility?
3. Can the runtime operate applications requiring Google Play Services?
4. What are the practical limitations of application integrity checks?
5. What is the best screen-streaming and input-forwarding architecture?
6. Should the mobile client initially be native Android or a PWA?
7. How should the runtime abstraction represent capabilities?
8. How should the AI understand application interfaces?
9. Which local models can perform reliable computer use on typical home hardware?
10. How should persistent Android storage and backups work?
11. How should audio and microphone access be forwarded?
12. What are the hardware requirements for running multiple instances?
13. How should remote access outside the local network work?
14. How can the platform securely isolate AI actions from the host operating system?

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

Do not introduce unnecessary abstractions, infrastructure or complexity.

Preserve the independence between the Android runtime, AI Engine and client application.

The ultimate objective is not to build another Android emulator, chatbot or remote desktop.

**The objective is to build an open-source, self-hosted personal computing environment where AI is the primary interface to applications and digital services.**

---

## Repository status

This repository currently implements the **M0 foundation**: a local Android runtime, a gateway, a
web client, and the contracts that keep them replaceable. The AI Engine, voice interaction and
autonomous workflows are deliberately not implemented yet.

| Area | Location |
| --- | --- |
| Constitution | `.specify/memory/constitution.md` |
| M0 specification | `specs/001-local-android-environment/spec.md` |
| Plan and research | `specs/001-local-android-environment/plan.md`, `research.md` |
| Contracts | `specs/001-local-android-environment/contracts/` |
| Tasks | `specs/001-local-android-environment/tasks.md` |
| Backend gateway | `backend/src/` |
| Web client | `client/src/` |
| Deployment | `deploy/` and `docs/deployment.md` |
| Operations | `docs/operations.md` |
| Architecture decisions | `docs/adr/` |

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
