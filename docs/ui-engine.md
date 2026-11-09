# UI Engine Specification

**Status**: Proposed. Required for the first intent-driven milestone (M1).
**Related**: [Architecture](architecture.md), [Interaction modes](interaction-modes.md),
[Authorization](authorization.md), [Open questions](open-questions.md).

The UI Engine is the component that makes ordinary applications usable through generated
interfaces. It observes an application, produces a normalized representation of its current state,
generates a contextual interface, and maps terminal actions back to the real application.

It is **not** a screen scraper that asks a model to click pixels by default. It is a deterministic
pipeline with model-assisted fallbacks.

## 1. Goals

- Let a user complete a task without navigating the application's native screens.
- Preserve the application as the source of truth; never invent state.
- Keep ordinary rendering independent of any LLM.
- Minimize inference and interface regeneration.
- Support all three interaction modes and fall back safely.
- Keep sensitive input away from model providers.

## 2. Non-goals

- Guaranteeing support for arbitrary applications before each is validated.
- Bypassing accessibility restrictions, integrity checks or platform rules.
- Reimplementing application business logic.
- Generating arbitrary HTML, JavaScript or native code from the backend.
- Replacing native UI; native mode remains available.

## 3. Pipeline

```text
Android app
   │
   ▼
UI Observer ──► raw observation (events, window, hierarchy, screenshot)
   │
   ▼
State Interpreter
   ├─ Level 1 deterministic
   ├─ Level 2 semantic (LLM, optional)
   └─ Level 3 visual (vision, experimental)
   │
   ▼
Normalized UI state ──► cache (keyed by state hash)
   │
   ▼
UI Generator ──► declarative interface (no LLM for standard components)
   │
   ▼
Terminal renders, user acts
   │
   ▼
Action Mapper (validates state version + permission) ──► runtime input
   │
   ▼
Next observation / verification
```

## 4. UI Observer

**Status**: MVP.

Responsibilities:

- Subscribe to Android accessibility events and window changes.
- Retrieve the active window and package.
- Extract the accessibility hierarchy: roles, text, content descriptions, bounds, enabled/checked
  state, actions and input types.
- Capture a screenshot only when the hierarchy is insufficient or a visual fallback is requested.
- Attach a monotonic observation timestamp and a source label (`accessibility`, `screenshot`,
  `cached`).

Constraints:

- Observations are scoped to the session and the active environment.
- Screenshots are transient and are never written to persistent storage by default.
- Password fields, OTP fields and other sensitive values are marked, not transmitted to models.
- Event storms are coalesced; observation has a bounded rate and backpressure policy.

Output: `Observation` with application id, window id, hierarchy, optional screenshot reference,
timestamp and capability flags.

## 5. State Interpreter

**Status**: Level 1 MVP; Level 2 MVP after the deterministic baseline; Level 3 experimental.

### Normalized representation

```json
{
  "stateVersion": "sha256:...",
  "application": "org.example.app",
  "screen": {
    "title": "Sign in",
    "kind": "form"
  },
  "elements": [
    {
      "ref": "e3",
      "role": "text_input",
      "label": "Phone number",
      "value": "",
      "required": true,
      "sensitive": true,
      "inputType": "phone",
      "actions": ["set_text"],
      "bounds": { "x": 40, "y": 320, "width": 640, "height": 96 }
    },
    {
      "ref": "e4",
      "role": "button",
      "label": "Continue",
      "enabled": true,
      "actions": ["click"]
    }
  ],
  "availableActions": ["submit", "back"],
  "nextStates": [
    { "action": "submit", "description": "Continue after entering a valid number" }
  ],
  "confidence": 0.94,
  "source": "deterministic"
}
```

Required fields: `stateVersion`, `application`, `screen.kind`, `elements[]`, `source`,
`confidence`. Element fields are optional except `ref`, `role`, `label` and `actions`.

`stateVersion` is a hash of the semantic content that matters for action safety. It MUST change when
elements, labels, values or enabling state change, and MUST be included in every action request.

### Level 1 — deterministic

No model inference. Rules and signals include:

- Accessibility roles and input types (text, phone, email, password, OTP, checkbox, spinner).
- Known form structures (label/input adjacency, submit buttons, OTP groups).
- Package and activity identity with a cached deterministic mapping.
- Text patterns for common fields (verification code, phone number, search).
- Stable action ids from the accessibility node.

This level handles ordinary native forms, lists, settings screens and familiar applications.

### Level 2 — semantic

Used when the deterministic representation is ambiguous, incomplete or unknown. The model receives a
redacted, structured hierarchy (never passwords/OTPs) and MUST return the normalized schema, not
free-form instructions. The response is validated; invalid output falls back to Level 3 or native
mode.

Caching:

- Cache mappings by `(application, screen signature)`.
- Invalidate on relevant hierarchy or package changes.
- Reuse cached mappings across sessions only when the application version and signature match.
- Never cache sensitive values.

### Level 3 — visual

Used only when accessibility data is missing or the state is custom-rendered (canvas, games,
non-standard WebViews). A vision model receives a screenshot with sensitive regions masked and
returns a structured candidate state. Results carry low confidence and always expose native mode.

This level is **experimental**; its accuracy, cost and latency must be measured before it is enabled
by default.

### Fallback order

1. Deterministic interpretation.
2. Semantic interpretation.
3. Visual interpretation.
4. Native UI mode.

The system records the chosen level and confidence for every action. A lower-confidence result MUST
not silently trigger a Commit action.

## 6. UI Generator

**Status**: MVP for the standard component set.

The generator maps the normalized state to a declarative interface. It does not need an LLM.

### Component set for MVP

- Text input, phone input, OTP input, password input.
- Selector / dropdown.
- List and list item.
- Card and image.
- Button and primary action.
- Confirmation dialog.
- Progress indicator.
- Error and status message.

### Future components

Charts, rich document previews, media players, map views, multi-step wizards, user-composed
dashboards.

### Rules

- Output is a versioned declarative schema; the terminal renders it with its own components.
- No arbitrary HTML, JavaScript or native code is accepted from the backend.
- Every input and action carries a stable `ref` and the `stateVersion` it was generated from.
- Interfaces are accessible: labels, roles, focus order, large touch targets and screen-reader text.
- Local input changes update terminal form state only; they MUST NOT regenerate the interface.
- Regeneration occurs when the observed state version or relevant application state changes.
- If the state cannot be represented safely, the generator returns native mode instead of a
  misleading form.

## 7. Action Mapper

**Status**: MVP.

An input action from the terminal contains:

- `stateVersion`
- element `ref`
- action (`set_text`, `click`, `select`, `scroll`, `submit`, `back`)
- payload (for text/selection)
- permission context

The mapper:

1. Rejects the action if `stateVersion` is stale.
2. Resolves `ref` against the current representation.
3. Checks that the action is allowed for the element and the session's permission level.
4. Maps the action to a runtime input operation (accessibility action first, touch coordinates
   second).
5. Waits for the next observation and verifies the expected transition where possible.
6. Returns a normalized result: applied, rejected, needs confirmation, unverified or failed.

Actions MUST be idempotent where the application allows it. Repeated submit actions require
deduplication. Commit-level actions MUST NOT be retried automatically.

## 8. Adaptive interaction

The UI Engine exposes three modes: conversational, structured UI and native UI. Mode selection,
transitions and user override are specified in [interaction-modes.md](interaction-modes.md).

## 9. Performance

These are **proposed engineering targets**, not measured guarantees. Each stage is measured
separately.

| Operation | Target | Notes |
| --- | ---: | --- |
| Render an already generated interface | < 100 ms | Terminal-side render, local values |
| Local input update | < 50 ms | No backend or application round trip |
| Deterministic state interpretation | < 300 ms | Accessibility hierarchy in, normalized state out |
| Semantic interpretation | < 2 s | Model inference and validation, excluding queueing |
| Action application | Measure | Depends on application and device |
| State verification | Measure | Polling or event-driven |

Rules:

- Do not regenerate interfaces when only local input values change.
- Debounce observation and coalesce events.
- Cache deterministic mappings and reuse them across sessions when safe.
- Measure observation, interpretation, generation, transport and application stages independently.
- Record p50/p95 in the deployment baseline rather than asserting them in the constitution.

## 10. Sensitive data

- Password and OTP values are flagged by the interpreter and never included in model prompts.
- Sensitive input is submitted over the authenticated terminal–backend channel and forwarded
  directly to the application.
- Values are not logged, cached or included in audit records.
- The UI Generator may render a password field without ever learning its value.
- Commit actions show the exact application and action being authorized.

## 11. Failure handling

| Failure | Behavior |
| --- | --- |
| Accessibility unavailable | Fall back to native mode; offer visual path only if enabled |
| Hierarchy too large | Summarize deterministically; ask the agent to narrow scope |
| Stale state version | Reject the action, refresh the observation, show a non-destructive notice |
| Model returns invalid schema | Fall back to the next interpretation level or native mode |
| Action has no visible effect | Verify, report unverified, do not retry Commit actions |
| Application crashes | Preserve environment, report the failure, offer restart |
| Terminal disconnects | Keep backend state; reconnect regenerates from current observation |

## 12. MVP scope and classification

| Capability | Classification |
| --- | --- |
| Accessibility observer | MVP |
| Deterministic interpreter for common forms/lists | MVP |
| Standard component generator | MVP |
| Action mapper with state-version validation | MVP |
| Basic conversational shell for UI flows (no planning) | MVP (M1) |
| Semantic interpreter with schema validation | MVP (M2, after deterministic baseline) |
| Agent-driven conversation and planning | MVP (M2) |
| Caching of known state mappings | MVP |
| Visual interpreter | Experimental |
| Arbitrary generated layouts | Future |
| Cross-application multi-step UI orchestration | Future |
| Preference learning | Experimental |

## 13. Acceptance criteria for M1

1. For a test application with a phone-number form, the user completes the flow through a generated
   form without seeing the native screen.
2. The same flow works with the LLM disabled, proving the deterministic path.
3. A stale action is rejected and the interface refreshes rather than applying the wrong action.
4. Password and OTP values never appear in logs, caches or model prompts in a redaction test.
5. Observation, interpretation and generation timings are recorded separately.
6. Native mode remains reachable in one explicit user action.
7. Unknown/custom-rendered screens fall back to native mode without crashing.

## 14. Open questions

Tracked in [open-questions.md](open-questions.md), including accessibility behavior inside Redroid,
hierarchy quality for Compose/Flutter/WebView surfaces, semantic-schema reliability, visual fallback
accuracy and the cost of caching.
