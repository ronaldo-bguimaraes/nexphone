# Adaptive Interaction Modes

**Status**: Proposed. Native mode is delivered in M0; structured mode is M1; conversational mode is
M2.
**Related**: [UI Engine](ui-engine.md), [Architecture](architecture.md),
[Authorization](authorization.md).

NexPhone supports three interaction modes for the same persistent environment. The environment and
application state are shared across modes; only the presentation and input path change.

## 1. Conversational mode

The user states intentions in natural language. The agent plans, acts and reports progress.

**Best for**: ambiguous requests, multi-step workflows, information retrieval, status updates,
tasks where no useful visual structure exists.

**Requirements**:

- Progress and failures are visible; no silent long-running actions.
- The agent states the interpretation level and confidence when it matters.
- Commit actions pause for explicit authorization.
- The user can switch to structured or native mode at any point.

## 2. Structured UI mode

The UI Engine generates a contextual interface: forms, lists, cards, selectors, confirmations or a
task-specific composition.

**Best for**: entering information, choosing between options, reviewing results, confirming a
purchase, selecting a contact, entering an OTP.

**Requirements**:

- Generated from observed application state, never invented.
- Deterministic for known structures; no LLM needed for standard rendering.
- Local input updates do not regenerate the interface.
- Stale actions are rejected with a refresh.
- The interface is accessible and works on small terminals.
- The user can open the native screen from any generated interface.

## 3. Native UI mode

The terminal displays the actual application screen and forwards touch, gesture and keyboard input.

**Best for**: unsupported applications, custom-rendered interfaces, debugging, user preference,
sensitive flows where the user wants direct control.

**Requirements**:

- Available in one explicit action from any mode.
- Uses the existing M0 streaming and input path.
- Does not bypass authorization; native mode is not a policy waiver.
- The agent can still observe and assist unless the user disables it.

## 4. Mode selection

Mode selection is a policy, not a model whim. The default order is:

1. If the user explicitly requested a mode, use it.
2. If a structured interface can be generated deterministically for the intent and state, use
   structured UI.
3. If the intent is exploratory, ambiguous or requires narration, use conversational mode.
4. If the state cannot be represented safely, use native mode.
5. If a Commit action is required, use a structured confirmation regardless of the active mode.

The agent MAY suggest a different mode, but suggestions are visible and reversible.

## 5. Transitions

| From | To | State preserved | Notes |
| --- | --- | --- | --- |
| Conversational | Structured | Yes | Generate from the latest observation |
| Structured | Conversational | Yes | Carry task context, not form values unless submitted |
| Structured | Native | Yes | Native view opens at the current application state |
| Native | Structured | Yes | Re-observe before generating |
| Any | Any | Yes | Terminal handoff preserves backend state |

Rules:

- Switching modes MUST NOT restart the application or environment.
- Unsubmitted local form values MAY be preserved in the terminal but MUST NOT be treated as
  application state.
- Generated interfaces are regenerated from a fresh observation after a mode switch.
- A mode switch caused by an error MUST explain why.

## 6. Terminal differences

The terminal declares capabilities (screen size, input methods, audio, camera, location). Mode
selection and UI generation adapt to those capabilities:

- Small screens prefer focused forms and cards over dense tables.
- Voice-only terminals use conversational mode with audio output.
- Terminals without a camera cannot supply camera capabilities through the Device Bridge.
- A terminal MUST NOT be required to run Android.

## 7. Failure and fallback

- No structured representation → native mode.
- No agent/model → structured and native modes continue to work.
- No accessibility → native mode; visual fallback only if enabled.
- Terminal disconnected → backend state remains; reconnect re-observes.
- Commit authorization denied → the action is not executed and the user sees a clear result.

## 8. MVP scope

| Capability | Classification |
| --- | --- |
| Native mode | M0 — delivered |
| Structured mode for common forms/lists | MVP (M1) |
| Mode switch from generated UI to native | MVP (M1) |
| Conversational task shell | MVP (M2) |
| Agent-selected mode | MVP (M2) |
| Voice-only terminal | Future |
| Cross-terminal handoff | Future |
| User-composed dashboards | Experimental |
