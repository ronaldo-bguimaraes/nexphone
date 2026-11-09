# Authorization and User Control

**Status**: Proposed. Policy enforcement is required before any agent Act/Commit capability ships.
**Related**: Constitution Principles 9 and 23, [Architecture](architecture.md),
[UI Engine](ui-engine.md), [Device Bridge](device-bridge.md).

NexPhone's agent is not a security boundary. It proposes and executes within a policy enforced by
the backend, outside the model.

## 1. Permission levels

| Level | Meaning | Examples | Default |
| --- | --- | --- | --- |
| **Read** | Inspect application information and retrieve data | Read a conversation, list products, read a booking, view profile | Allowed within a session, subject to scopes |
| **Act** | Modify application state without external consequence | Navigate, fill a form, search, open a screen, prepare a message | Allowed with session scope; visible to the user |
| **Commit** | Consequential or irreversible action | Send a message, purchase, book, request a ride, change an account setting, transfer money | Deny by default; explicit authorization required |

The level is a property of the operation, not of the application. The same screen can offer Read,
Act and Commit actions.

## 2. Authorization flow

```text
Agent proposes action
   │
   ▼
Policy engine classifies Read / Act / Commit
   │
   ├─ Read ──► execute within scope, audit
   ├─ Act ───► execute, show progress, audit
   └─ Commit ─► render exact confirmation
                 │
                 ├─ user authorizes ──► execute once, capture receipt, audit
                 └─ user denies ─────► no execution, report
```

Rules:

- The policy engine classifies the action; the model cannot reclassify it.
- The confirmation shows the application, exact action, amount/recipient where applicable and the
  data being used.
- Authorization is single-use for Commit actions unless a scoped standing permission is explicitly
  granted.
- Step-up authentication MAY be required for high-risk operations in a future milestone.
- A Commit action that cannot be verified is reported as unverified, never as successful.

## 3. Sensitive data

- Passwords, OTPs, PINs, payment details and private keys MUST NOT be sent to model providers.
- Sensitive input is flagged by the UI Engine, rendered locally, and forwarded directly to the
  application.
- Sensitive values are excluded from logs, caches, audit records and conversation memory.
- If a model needs to reason about a sensitive field, it receives only its type and constraints
  (for example, "OTP, 6 digits"), never the value.
- Credentials are stored only where the application or a dedicated secret store requires them;
  NexPhone does not build a plaintext credential database.

## 4. Scopes and sessions

- A session carries an explicit set of permission levels and application scopes.
- Acting outside the scope stops and asks the user to expand it.
- Revoking a permission takes effect immediately for in-flight agent actions; a Commit in progress
  is cancelled where the application allows it.
- Terminal handoff preserves the backend scope, not terminal-local grants; device capabilities are
  re-consented on the new terminal.

## 5. Audit

Significant automated operations SHOULD be auditable. An audit record contains:

- timestamp, session, terminal and environment identifiers;
- application and action;
- permission level and authorization outcome;
- interpretation source and confidence;
- result status (applied, rejected, unverified, failed), without sensitive values.

Audit records are retained according to `logging.retentionDays` or a separate retention policy for
multi-user deployments.

## 6. Threat model

| Threat | Mitigation |
| --- | --- |
| Prompt injection causes a Commit | Policy engine classifies and requires explicit consent outside the model |
| Model misreports success | Backend verifies state; unverified outcomes are labeled |
| Stolen terminal session | Short-lived tokens, revocation, scoped sessions |
| Malicious application in the environment | Runtime isolation; no host privileges; policy applies to actions |
| Secret leakage to a provider | Sensitive-field flags and redaction before inference |
| Replay of a stale UI action | State-version validation in the Action Mapper |
| Device capability abuse | Per-request consent, scoped grants, immediate revocation, audit |

Residual risks are documented rather than hidden: a compromised backend or host is outside the
protection of this model.

## 7. Interaction with the UI Engine

- Every generated action declares its permission level.
- Commit controls are rendered with an explicit confirmation component, never as a one-tap button.
- The Action Mapper rejects actions whose state version or permission context is stale.
- The UI Generator cannot downgrade a Commit action to Act.

## 8. Interaction with the Device Bridge

- Capability requests carry a purpose and scope.
- Location, camera and microphone require explicit consent per use unless a scoped standing grant
  exists.
- The broker enforces consent; neither the agent nor the execution environment can bypass it.

## 9. MVP scope

| Capability | Classification |
| --- | --- |
| Session auth and single-session enforcement | M0 — delivered |
| Read/Act classification and policy engine | MVP (M1) |
| Commit confirmation and single-use authorization | MVP (M1) |
| Sensitive-field exclusion from model prompts | MVP (M1) |
| Audit records for significant operations | MVP (M1) |
| Step-up authentication | Future |
| Multi-user roles and quotas | Future |
| Scoped standing permissions | Future |

## 10. Acceptance criteria

1. A Read action executes within scope and is audited.
2. An Act action executes and is visible in progress.
3. A Commit action cannot execute without an explicit confirmation showing the exact operation.
4. Denying a Commit leaves the application unchanged.
5. A stale generated action is rejected instead of executed.
6. An injected instruction claiming user authorization does not bypass the policy engine.
7. OTP and password values are absent from logs, caches, audit records and model prompts.
8. Revoking a permission stops subsequent actions immediately.
