# NexPhone Architecture

**Status**: Proposed reference architecture, derived from constitution v1.2.0.
**Scope**: Platform-wide. The M0 implementation is described in
`specs/001-local-android-environment/`.

This document describes the long-term shape of NexPhone. It does not claim that every component
exists. Each component is marked with one of:

- **M0 — delivered**: implemented in the current repository.
- **MVP — next**: required for the first intent-driven milestone.
- **Future**: planned, not required for MVP.
- **Experimental**: requires a proof of concept before commitment.

## 1. Product in one paragraph

NexPhone gives a user a persistent computing environment that an agent can operate. The user
expresses an intention through a terminal. The backend hosts the execution environment, the agent
plans and acts, and the UI Engine turns the observed state of ordinary applications into contextual
interfaces. Applications do not need APIs, MCP servers or dedicated AI integrations. Android is the
first execution environment; it is not the architecture.

## 2. Three fundamental roles

| Role | Responsibility | Must not |
| --- | --- | --- |
| **Backend** | Host execution environments, persistent state, the agent runtime, the UI Engine, policy and data | Assume a specific terminal platform or Android-only execution |
| **Terminal** | Display generated interfaces, capture input, connect, optionally broker device capabilities | Host applications, own application data, or depend on Android internals |
| **Agent** | Interpret intentions, plan, select mechanisms, execute, request authorization, report outcomes | Depend on a specific runtime, a specific model provider, or bypass policy |

The roles are logical. In M0, the Backend is the gateway plus the Android runtime adapter and the
Terminal is the mobile web client. The Agent and UI Engine are not implemented yet.

## 3. Logical components

```text
                         +--------------------------------------+
                         |              TERMINAL                |
                         |  chat | generated UI | native view  |
                         |  input | connectivity | Device Bridge|
                         +------------------+-------------------+
                                            |
                              HTTPS / WSS (declarative contract)
                                            |
+-------------------------------------------v-------------------------------------------+
|                                        BACKEND                                        |
|                                                                                       |
|  +-------------+   +----------------+   +----------------+   +--------------------+   |
|  |  Session &  |   |     Agent      |   |   UI Engine    |   |  Policy & Audit    |   |
|  |    Auth     |   | planner/exec   |   | observer       |   | Read/Act/Commit    |   |
|  |             |   | tools/memory   |   | interpreter    |   | consent, receipts  |   |
|  +-------------+   +--------+-------+   | generator      |   +--------------------+   |
|                             |           | action mapper  |                            |
|                             |           +--------+-------+                            |
|                             |                    |                                    |
|                    Execution-environment contract (versioned)                        |
|                             |                    |                                    |
|               +-------------v--------------------v-------------+                      |
|               |            Execution environments              |                      |
|               |  Android (M0) | Linux | Browser               |                      |
|               +-----------------------------------------------+                      |
|                                                                                       |
|  Persistent storage: environments, app data, sessions, UI state cache, audit records  |
+---------------------------------------------------------------------------------------+
```

### Component catalogue

| Component | Role | Responsibility | Status |
| --- | --- | --- | --- |
| Runtime adapter contract | Backend | Lifecycle, capabilities, apps, screen, input, storage | M0 — delivered |
| Android runtime adapter | Backend | Provisional Redroid implementation | M0 — delivered |
| Gateway API and WebSocket | Backend | Auth, status, runtime/app control, screen stream | M0 — delivered |
| Web terminal | Terminal | Pairing, native screen view, input | M0 — delivered |
| UI Observer | Backend / UI Engine | Accessibility events, windows, hierarchy, screenshots | MVP (M1) |
| State Interpreter | Backend / UI Engine | Normalized application state, deterministic then semantic | MVP (M1/M2) |
| UI Generator | Backend / UI Engine | Declarative contextual interfaces without an LLM | MVP (M1) |
| Action Mapper | Backend / UI Engine | State-checked mapping from interface actions to app actions | MVP (M1) |
| Agent runtime | Backend / Agent | Intent parsing, planning, execution, tool selection | MVP (M2) |
| Policy engine (Read/Act/Commit) | Backend | Authorization enforced outside the LLM | MVP (M1) |
| Device Bridge broker | Backend | Consent-bound access to terminal capabilities | Future (M3) |
| Terminal capability client | Terminal | Camera, location, mic, notifications, clipboard, files | Future (M3) |
| Execution-environment registry | Backend | Multiple Android/Linux/browser environments | Future (M4) |
| Visual interpreter | Backend / UI Engine | Screenshot/vision fallback | Experimental (M5) |
| Cross-terminal handoff | Backend + Terminal | Resume a task on another terminal | Future (M4) |
| Preference learning | Backend / Agent | Social recommendation ranking from feedback | Experimental (M5) |

"M0 — delivered" means the code exists and its automated tests pass. The Redroid isolation and boot
gate on real KVM + binder hardware is still open (ADR-0003); M0 is not fully accepted until it
passes.

## 4. Intent-driven request flow

1. The user states an intention in the terminal (text or voice).
2. The Backend authenticates the session and attaches the current permission scope.
3. The Agent resolves the intention into a plan and selects an execution environment.
4. The Agent checks whether deterministic capabilities or a native integration satisfy the step.
5. The UI Engine observes the relevant application and produces a normalized state.
6. The UI Generator renders a contextual interface, or the Agent stays in conversational mode.
7. The user acts in the interface; the Action Mapper validates the state version and maps the
   action to the application.
8. The Agent verifies the outcome from the next observed state and reports it.
9. Commit-level actions pause for explicit authorization and produce an audit record.

The native screen remains available at every step. The user can request it explicitly.

### 4.1 Representative workflows

**Account setup (WhatsApp-like)**

1. The user asks to install and configure the application.
2. The Agent checks installation, installs if needed and opens the application.
3. The UI Engine observes a phone-number form and generates a contextual phone field.
4. The user submits the number; the Action Mapper fills the real field.
5. A verification state produces an OTP form. The OTP is never sent to a model.
6. The Agent verifies the result and reports success.
7. The native screen remains available at every step.

This is the M1 acceptance scenario.

**Ride request**

1. The user asks for a ride.
2. The Device Bridge (M3) requests consented location.
3. The Agent supplies the location to the execution environment.
4. The UI Engine interprets ride options and generates a comparison view.
5. The user selects an option.
6. The Agent prepares the request; the Commit confirmation shows destination, vehicle and price.
7. Only after explicit authorization does the Agent submit the request.

**Shopping**

Search and comparison are Read/Act. Preparing a cart is Act. Placing an order or paying is Commit
and always requires confirmation. The agent may not complete a purchase from conversation alone.

**Social applications**

Browsing profiles and presenting cards is Read. Collecting explicit preferences is Act. Sending
messages, following, liking or other interpersonal actions remain under user control and follow
platform rules. Recommendation and autonomous interaction are separate concerns:
recommendations may be learned from feedback; consequential interpersonal actions require explicit
authorization.

## 5. Contracts and boundaries

| Boundary | Contract | Rule |
| --- | --- | --- |
| Terminal ↔ Backend | HTTPS + WSS; declarative UI schema; binary native stream | The terminal never receives runtime internals or credentials |
| Agent ↔ Execution environment | Versioned runtime adapter contract | No Android-specific identifiers outside the adapter |
| UI Engine ↔ Terminal | Versioned UI schema with state version | No arbitrary backend-supplied code or HTML |
| UI Engine ↔ Agent | Observation, interpretation and action APIs | Every action carries a state version and permission level |
| Backend ↔ Device Bridge | Capability request/response with consent token | Capabilities are opt-in, scoped and revocable |
| Backend ↔ Model providers | Provider-neutral inference interface | Provider-specific behavior stays behind the adapter |

Detailed contracts will be specified with each milestone. The M0 runtime adapter contract is in
`backend/src/runtime/contract.ts` and documented in
`specs/001-local-android-environment/contracts/runtime-adapter.md`.

## 6. State ownership

| State | Owner | Lifetime |
| --- | --- | --- |
| Execution environment and application data | Backend | Persistent |
| Session and pairing credentials | Backend | Expiring, revocable |
| Conversation and task state | Backend / Agent | Configurable retention |
| Observed UI state and normalized representation | UI Engine | Short-lived, cacheable |
| Generated interface definitions | UI Engine | Regenerated on relevant state change |
| Terminal input and local form values | Terminal | Until submitted, then discarded |
| Device capabilities | Terminal | Per request, with consent |
| Audit records | Backend | Configurable retention |

## 7. Degradation and failure

The architecture must remain usable when an intelligent component is unavailable:

- **No LLM**: conversational and semantic interpretation degrade; deterministic structured UI and
  native mode still work.
- **No accessibility data**: the UI Engine falls back to native mode or the experimental visual
  path.
- **No network to the Backend**: the terminal shows a clear disconnected state; no local execution
  is implied.
- **Runtime failure**: environment state is preserved; the agent reports the failure and recovery
  options.
- **UI state changed**: stale actions are rejected and the interface is regenerated.

## 8. Security boundaries

- The Agent is not a security boundary. Policy enforcement lives in the Backend.
- The Terminal is not trusted with application credentials.
- The UI Engine never sends passwords, OTPs or private application data to a model provider
  without an explicit, documented need.
- The Android runtime is isolated from the host; see ADR-0003.
- Device capabilities are separate from the execution environment and require per-request consent.

See `docs/authorization.md` for the Read/Act/Commit model.

## 9. Architecture principles mapped

| Principle | Architectural consequence |
| --- | --- |
| AI-native interaction | Agent is the primary interface; structured UI is first-class |
| Persistent environments | Backend owns durable environment state |
| Execution environment independence | Runtime contract; Android is one adapter |
| Terminal independence | Declarative terminal contract; no Android coupling |
| Intent-driven interfaces | UI Engine is a Backend component, not an overlay in the terminal |
| Application independence | Mechanism priority: API → MCP → accessibility → visual |
| Human and agent coexistence | Three modes; user override; commit authorization |
| Deterministic execution first | Level 1 interpretation before LLM |
| LLM only when necessary | Explicit fallback ladder and caching |
| Explicit authorization | Read/Act/Commit enforced outside the model |
| Open-source extensibility | Versioned public contracts and community adapters |
| Self-hosting | Single-host deployment remains the default |

## 10. Non-goals for this architecture

- Replacing every native application interface.
- Automating applications against their platform rules or integrity checks.
- A proprietary cloud control plane.
- A single mandatory model provider.
- A distributed multi-tenant platform in the near term.
- Promising parity across execution environments before each is validated.

## 11. What changed, and what was preserved

This architecture evolves the existing documents rather than replacing them.

**Preserved decisions**

- Local-first, self-hosted deployment on a single Linux host.
- Android as the first execution environment, with Redroid as a provisional candidate only.
- Runtime adapter contract and subsystem independence (ADR-0002).
- Native screen streaming and input as a first-class mode and fallback.
- Pairing/session authentication, runtime isolation and refusal of privileged containers.
- Incremental delivery; no Kubernetes, custom LLM or mandatory cloud service.
- The M0 specification remains valid and is the first milestone, not a contradiction.

**Concepts added or clarified**

- Three roles: Backend, Terminal and Agent, mapped onto the existing subsystems.
- The UI Engine as a Backend component with deterministic-first interpretation.
- Terminal independence and execution-environment independence as constitutional principles.
- Read/Act/Commit authorization levels and policy enforcement outside the model.
- Application mechanism priority: native API, MCP, accessibility, visual, native fallback.
- Adaptive interaction modes and explicit user override.
- Device Bridge as an optional, consent-bound capability broker.

**Contradictions resolved**

- The README previously described only native remote interaction while claiming AI-native
  interfaces. The UI Engine now has an explicit owner, contract and milestone.
- Two ADR numbering schemes existed (README ADR-001…008 and `docs/adr/0001…0009`). The README now
  points to the maintained ADR log and maps decisions instead of duplicating numbers.
- The technology table described Python, LangGraph and PostgreSQL as candidates while the delivered
  M0 uses Node.js, Fastify and SQLite. It now distinguishes current choices from candidates.
- The old roadmap used milestones that did not match the delivered M0. It now separates delivered
  execution foundations from intent-driven milestones.
- "Application independence" was stated but the interaction mechanism order was implicit. It is now
  explicit and testable.

**Still unresolved**

The validation list in [open-questions.md](open-questions.md) remains the source of truth. The
highest-risk items are the Redroid isolation gate, accessibility quality inside the container, and
the reliability of semantic interpretation.

## 12. Related documents

- [UI Engine](ui-engine.md)
- [Interaction modes](interaction-modes.md)
- [Device Bridge](device-bridge.md)
- [Authorization](authorization.md)
- [Roadmap](roadmap.md)
- [Open questions](open-questions.md)
- [ADR log](adr/README.md)
