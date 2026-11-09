# Open Questions and Decisions Requiring Validation

**Status**: Living document. Nothing here is a committed capability.
**Related**: [Roadmap](roadmap.md), [UI Engine](ui-engine.md), [Device Bridge](device-bridge.md).

Each item states why it matters, how to validate it, and the milestone that must resolve it. A
failed validation is a design input, not a reason to weaken security or honesty.

## 1. Execution environment and Android

| # | Question | Why it matters | Validation | Milestone |
| --- | --- | --- | --- | --- |
| E1 | Does accessibility work inside the provisional Redroid container, including event delivery and hierarchy retrieval? | The UI Engine has no deterministic path without it | Build a probe app; subscribe to events; compare hierarchy to a physical device | M1 |
| E2 | How good is the hierarchy for Compose, Flutter, React Native and WebView surfaces? | Deterministic coverage depends on semantic nodes | Test a matrix of open-source apps; record missing labels/roles | M1 |
| E3 | Can the runtime expose accessibility without granting broader host privileges? | Isolation gate (ADR-0003) must hold | Boot with the restricted capability set and enable accessibility | M1 |
| E4 | What is the latency and reliability of screenshot capture versus hierarchy retrieval? | Determines the visual fallback budget | Measure p50/p95 for both paths | M1 |
| E5 | Which input path is more reliable: accessibility actions or touch injection? | Action Mapper correctness | Compare success rates across widgets | M1 |
| E6 | How are applications installed without Google Play? | Product usability and licensing | Evaluate APK sources, F-Droid, enterprise distribution; document limits | M1 |
| E7 | Which applications fail due to Play Services or integrity checks? | User expectations | Compatibility matrix with real apps | M1 |
| E8 | Does Redroid boot and run an app without `--privileged`? | Constitutional security gate | Phase 0 spike; record the minimum capability set | M0 gate |
| E9 | What are the minimum host resources for one environment? | Deployment baseline | Measure CPU/RAM/disk at idle and under load | M0/M1 |

## 2. UI Engine

| # | Question | Why it matters | Validation | Milestone |
| --- | --- | --- | --- | --- |
| U1 | What percentage of common forms/lists can Level 1 interpret correctly? | Determines whether the deterministic promise holds | Curated corpus of screens; precision/recall | M1 |
| U2 | Is the normalized schema expressive enough for real applications? | Generator and Action Mapper depend on it | Encode 20 real screens; identify missing fields | M1 |
| U3 | How stable is `stateVersion` across minor UI changes? | Prevents stale actions and unnecessary regeneration | Replay state changes; measure false invalidations | M1 |
| U4 | Can a local model return the schema reliably and quickly? | Level 2 feasibility and privacy | Evaluate small models; measure valid-schema rate and latency | M2 |
| U5 | Does semantic interpretation leak sensitive values? | Privacy | Redaction tests and prompt inspection | M2 |
| U6 | Is visual interpretation accurate enough to be useful? | Coverage for custom-rendered apps | Benchmark on masked screenshots; measure error/cost | M5 (experimental) |
| U7 | How should UI state be cached and invalidated? | Latency and correctness | Prototype cache keyed by app/signature/version | M1 |
| U8 | Can generated interfaces be accessible on small terminals? | Usability | Accessibility audit and phone testing | M1 |
| U9 | How are local form values preserved across mode switches without confusing them with app state? | UX and correctness | Usability test with mode switching | M1/M2 |

## 3. Agent

| # | Question | Why it matters | Validation | Milestone |
| --- | --- | --- | --- | --- |
| A1 | Which planning approach is reliable enough for multi-step tasks? | Core agent quality | Compare scripted, graph-based and model-driven planners | M2 |
| A2 | Which provider-neutral inference interface is sufficient? | Avoid vendor lock-in | Prototype two providers and a local model | M2 |
| A3 | How resistant is the agent to prompt injection from application content? | Security | Adversarial screens and messages; policy tests | M2 |
| A4 | What task state must survive disconnects and restarts? | Cross-terminal continuity | Kill/reconnect tests | M2/M4 |
| A5 | How should memory be scoped, retained and forgotten? | Privacy and usefulness | Retention controls and user inspection | M6 |

## 4. Device Bridge

| # | Question | Why it matters | Validation | Milestone |
| --- | --- | --- | --- | --- |
| D1 | Do target applications accept Android mock locations? | Location workflows | Test with representative apps; record detection | M3 |
| D2 | What are the constraints on camera and microphone access from a browser terminal? | Capability availability | Browser permission and foreground tests | M3 |
| D3 | Can consent be requested without breaking task flow? | UX | Usability test with location-dependent task | M3 |
| D4 | How should capability data be minimized before reaching a model? | Privacy | Data-flow review and redaction tests | M3 |
| D5 | Should standing grants exist, and with what limits? | Convenience vs risk | Threat model and user study | Future |

## 5. Multiple environments and terminals

| # | Question | Why it matters | Validation | Milestone |
| --- | --- | --- | --- | --- |
| M1 | What does the execution-environment contract need beyond the Android adapter? | Avoiding a redesign for Linux/browser | Draft contract; implement a stub second environment | M4 |
| M2 | How are resources isolated between multiple instances? | Host stability | Concurrent load test with limits | M4 |
| M3 | What is the handoff protocol between terminals? | Continuity promise | Start on one terminal, resume on another | M4 |
| M4 | How are sessions and permissions scoped across terminals? | Security | Threat model and revocation tests | M4 |

## 6. Security and authorization

| # | Question | Why it matters | Validation | Milestone |
| --- | --- | --- | --- | --- |
| S1 | Can Read/Act/Commit be classified reliably from the normalized state? | Prevents unauthorized consequences | Corpus of actions; manual review of misclassifications | M1 |
| S2 | What is the safest UX for Commit confirmation? | User control | Usability and comprehension test | M2 |
| S3 | How are OTPs and passwords kept out of every model path? | Privacy | Redaction tests across interpreter and agent | M1 |
| S4 | What must an audit record contain without storing sensitive values? | Accountability | Schema review and sample records | M1 |
| S5 | How should prompt injection be detected and contained? | Agent security | Adversarial tests and policy boundary tests | M2 |
| S6 | What is the threat model for a compromised terminal? | Session and capability design | STRIDE-style review | M2 |

## 7. Performance

| # | Question | Why it matters | Validation | Milestone |
| --- | --- | --- | --- | --- |
| P1 | Are the proposed UI targets achievable on the reference host? | Product feel | Measure each stage independently | M1 |
| P2 | What is the real cost of semantic interpretation? | Latency and hardware | Measure local and remote models | M2 |
| P3 | How often must interfaces regenerate? | Efficiency | Instrument regeneration causes | M1 |
| P4 | Does caching improve latency without causing wrong actions? | Correctness | Replay tests and stale-action tests | M1 |
| P5 | What is the resource cost of the UI Engine and agent? | Self-hosting viability | Measure idle and active profiles | M1/M2 |

## 8. Decisions that must not be assumed

- Do not assume every application exposes usable accessibility data.
- Do not assume every application accepts mock location or simulated hardware.
- Do not assume a model can classify consequential actions safely without policy.
- Do not assume an LLM is required for a useful interface.
- Do not assume a terminal runs Android.
- Do not assume Redroid is the final execution environment.

## 9. How to record outcomes

Resolved questions MUST update the relevant document and, when they affect boundaries, security,
persistence, compatibility or deployment, add or amend an ADR. Unresolved questions remain here
with an owner and milestone; they are not silently dropped.
