# ADR-0002: Runtime adapter contract and versioning

- **Status:** Accepted
- **Date:** 2026-11-09
- **Deciders:** Project maintainers
- **Related:** [ADR-0001](0001-record-architecture-decisions.md), Principle 4, Principle 12

## Context

NexPhone must not couple the gateway or client to Redroid or any other specific Android runtime.
The constitution requires a standardized abstraction with documented contracts, discoverable
capabilities, independently testable implementations and support for alternative runtimes.

M0 needs a contract that is small enough to implement now, but complete enough to cover lifecycle,
readiness, capabilities, application management, persistence, screen capture and input.

## Options considered

1. **Direct Redroid calls from API handlers.** Fastest to write, but violates Principle 4 and makes
   the boundary test impossible.
2. **A process-boundary RPC contract.** Strong isolation and language independence, but adds a
   service, transport, packaging and failure modes that M0 does not need.
3. **An in-process TypeScript interface with normalized errors, a registry and a conformance
   suite.** Minimal infrastructure, testable, and replaceable at the module boundary.

## Decision

We will use an in-process `RuntimeAdapter` interface (`contractVersion 1.0.0`) with:

- lifecycle and health methods;
- capability discovery;
- application install/list/launch/stop;
- storage inspection;
- a transport abstraction for video packets and input;
- normalized `AdapterErrorCode` failures;
- a registry selected by configuration;
- a conformance suite that every adapter, including the fake adapter, must pass.

The contract is documented in `specs/001-local-android-environment/contracts/runtime-adapter.md`.
Semantic versioning governs compatibility; the gateway accepts `^1.0.0`.

## Consequences

### Positive

- The client and gateway contain no runtime-specific identifiers (enforced by a test).
- A second adapter can be added without touching unrelated modules.
- Contract tests give objective evidence of replaceability.
- A future out-of-process adapter can implement the same semantics.

### Negative

- In-process adapters share the gateway's trust boundary.
- The contract may need extension as runtime features grow; each extension is a versioning event.
- An in-process bug can crash the gateway, though not vice versa.

### Risks and mitigations

- **Contract drift**: the conformance suite and version check catch semantic changes.
- **Leaky abstractions**: the boundary test scans for runtime-specific strings outside the adapter.
- **Isolation**: the contract does not solve container isolation; ADR-0003 handles that.

## Affected principles

- Principle 3 — subsystem separation.
- Principle 4 — runtime abstraction and replaceability.
- Principle 12 — modular and extensible engineering.
