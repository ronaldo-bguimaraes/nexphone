# Writing a runtime adapter

NexPhone talks to Android runtimes only through the contract in
`backend/src/runtime/contract.ts`, documented in
`specs/001-local-android-environment/contracts/runtime-adapter.md`.

## 1. Implement the interface

Create `backend/src/runtime/<name>/adapter.ts` exporting a class that implements `RuntimeAdapter`.
Required behavior:

- `validateHost()` returns one structured check per prerequisite.
- `start()` and `stop()` are idempotent.
- `waitForReady()` resolves or rejects within its timeout; it never hangs.
- `getStatus()` is side-effect free.
- Application operations return normalized `AdapterErrorCode` failures.
- `openTransport()` returns one video iterable and one input sink, and rejects a second transport
  with `SESSION_BUSY`.
- `onStateChange()` emits exactly one event per transition.

Keep every runtime-specific identifier, command, path and image name inside your adapter directory.

## 2. Register it

In `backend/src/main.ts`, register a factory:

```ts
registerAdapter("myruntime", (config) => new MyRuntimeAdapter(config));
```

Then set `runtime.adapter: myruntime` in `config/nexphone.yaml`.

## 3. Pass the contract suite

Add your adapter to `backend/tests/contract/runtime-adapter.spec.ts` or instantiate the same
assertions from your own test file. The suite covers lifecycle idempotency, readiness, capabilities,
application management, storage, transport, input and single-session enforcement.

## 4. Prove isolation

Your adapter MUST NOT:

- use Docker `--privileged`;
- mount the host Docker socket, root filesystem or home directory;
- share the host PID or network namespace;
- grant broader capabilities than documented in an ADR.

Run `deploy/scripts/check-isolation.sh` against a running container and record the minimum
capability set in an ADR.

## 5. Document and test

- Add an ADR describing the runtime, alternatives and consequences.
- Record the isolation decision and capability list.
- Add `@integration` tests for real boot, app lifecycle and persistence.
- Update `docs/compatibility.md` with verified limitations.

## Contract versioning

The adapter reports `contractVersion`. The gateway accepts `^1.0.0`. Adding optional behavior is a
MINOR change; changing required semantics is a MAJOR change and needs an ADR.
