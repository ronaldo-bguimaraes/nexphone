# Device Bridge Specification

**Status**: Proposed, future extension. Requires proof of concept before commitment.
**Related**: [Architecture](architecture.md), [Authorization](authorization.md),
[Interaction modes](interaction-modes.md).

The Device Bridge connects physical terminal capabilities to the backend. It treats the terminal as
a source of capabilities, not as the host of the computing environment.

## 1. Why it exists

The execution environment has no camera, GPS, cellular radio or personal sensor context. The phone
does. The Device Bridge lets an authorized agent use those capabilities without moving the
application runtime onto the phone.

Example: a ride request needs the user's current location, but the ride application runs in the
virtual environment.

## 2. Capabilities

| Capability | Classification | Notes |
| --- | --- | --- |
| Location | Future (first PoC) | Foreground, user-initiated; mock-location limitations apply |
| Notifications | Future | Terminal receives notifications; backend may request delivery |
| Clipboard | Future | Explicit read/write, never background scraping |
| Files | Future | User-selected files only; scoped and time-limited |
| Camera | Future | Foreground capture, explicit consent |
| Microphone | Experimental | Foreground capture, visible indicator, no continuous recording |
| Audio output | Future | Playback on the terminal |
| Device status | Future | Battery, connectivity, display, OS version |
| Sensors | Experimental | Accelerometer, gyroscope, etc. |

## 3. Architecture

```text
Terminal capability client
   │  authenticated WSS
   ▼
Device Bridge broker (Backend)
   │  capability grants + consent tokens
   ▼
Agent / Execution environment
```

- The terminal registers the capabilities it supports at session start.
- The broker issues short-lived grants per capability and per task.
- The agent requests a capability with a stated purpose and duration.
- The user sees a consent prompt naming the capability, purpose and data recipient.
- The broker returns a scoped value to the requester and records an audit event.
- The terminal can revoke a grant at any time; the broker stops delivering values.

The bridge MUST NOT give the execution environment direct access to terminal hardware. Data flows
through the broker so consent, minimization and audit remain enforceable.

## 4. Protocol sketch

All messages are JSON over the authenticated terminal WebSocket (versioned).

Registration:

```json
{
  "type": "device_bridge.register",
  "capabilities": ["location", "notifications", "clipboard"],
  "platform": "android"
}
```

Request:

```json
{
  "type": "device_bridge.request",
  "requestId": "r-123",
  "capability": "location",
  "purpose": "Find nearby ride pickup points",
  "scope": "once",
  "expiresInSeconds": 60
}
```

Consent result:

```json
{
  "type": "device_bridge.result",
  "requestId": "r-123",
  "status": "granted",
  "value": { "latitude": -23.55, "longitude": -46.63, "accuracyMeters": 25 },
  "observedAt": "2026-11-09T12:00:00Z"
}
```

Denied, expired and revoked results use the same envelope with `status` set accordingly and no
value.

## 5. Consent and permissions

- Capability access is opt-in per session and per request unless the user grants a scoped
  standing permission.
- Consent prompts MUST state the capability, purpose, requesting component and expiry.
- Read-level capabilities (status, clipboard read) and Act-level capabilities (clipboard write,
  notification actions) follow the authorization model.
- Camera, microphone and location are always foreground and visibly indicated.
- Sensitive values MUST NOT be sent to model providers; the backend uses them locally or passes
  them to the execution environment.
- Revocation takes effect immediately and is audited.

## 6. Mock location and integrity limitations

Android mock location is a developer feature with real constraints:

- It generally requires developer options and a mock-location app or ADB command.
- Applications may reject mock locations or detect them.
- Play Integrity and similar attestations may fail.
- NexPhone MUST NOT attempt to bypass those checks or misrepresent the device.
- When mock location is unavailable or rejected, the agent MUST report the limitation and ask the
  user to provide the location manually or use native mode.

The same caution applies to camera, microphone and sensor simulation: the project does not promise
that every application accepts virtual capabilities.

## 7. Security and privacy

- Data minimization: request the narrowest scope and shortest duration.
- No background capture without an explicit, visible grant.
- Values are not logged; audit records contain capability, purpose and outcome, not raw values.
- Terminal compromise is a risk; grants are scoped and revocable.
- The broker validates capability names, payload sizes and rate limits.
- The execution environment cannot enumerate or command terminal capabilities directly.

## 8. MVP scope

| Phase | Capability |
| --- | --- |
| First PoC | Location read, notifications, clipboard read/write |
| Next | Files, camera, audio output |
| Experimental | Microphone, sensors, continuous capabilities |

The Device Bridge is **not required** for M0 or M1. It becomes relevant when agent workflows need
physical context.

## 9. Acceptance criteria for the first PoC

1. The terminal registers capabilities and the backend lists them.
2. A location request displays a consent prompt and returns a value only after consent.
3. Denial returns a clear result and no value.
4. Revocation stops delivery immediately.
5. Raw location values do not appear in logs or audit records.
6. A mock-location failure is reported accurately without claiming success.
