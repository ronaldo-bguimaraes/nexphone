# Quickstart Validation — NexPhone M0

**Purpose**: Prove the M0 feature works end to end on the reference host.
**Reference host**: Ubuntu 24.04 LTS, x86_64, hardware virtualization enabled.
**Prerequisites**: Docker Engine 27+ with Compose v2, Android platform-tools, Git, a phone on the
same LAN with a current Chrome or Edge browser.

This guide validates the feature; it is not an implementation tutorial. Implementation details live
in `tasks.md` once generated.

## 0. Preflight

Before deploying, verify the host:

```bash
# Virtualization
ls -l /dev/kvm
# Binder (container runtime candidate)
modprobe binder_linux devices=binder,hwbinder,vndbinder
ls /dev/binderfs || mount -t binder binder /dev/binderfs
# Graphics (optional)
ls /dev/dri/renderD* 2>/dev/null || echo "software rendering"
# Ports
ss -ltn | grep -E ':8443|:5555' || true
# Disk and memory
df -h . && free -h
```

**Expected**: `/dev/kvm` exists and is accessible, binder is available, and the documented ports are
free. `deploy/scripts/preflight.sh` automates these checks and prints remediation for failures.

**Failure drill**: disable virtualization in firmware or run in a VM without nested KVM, then run
the preflight. **Expected**: a non-zero exit and a message naming the missing prerequisite, not a
runtime launch attempt.

## 1. Configure

```bash
cp deploy/.env.example deploy/.env
# Edit deploy/.env and config/nexphone.yaml
```

Set at minimum:

- LAN interface and port (`8443` default).
- Pinned runtime image digest.
- Absolute paths for `storage.dataPath` and `storage.statePath`.
- TLS mode (`caddy-internal` for the reference setup).

**Expected**: configuration is validated at startup; an unknown key or a floating image tag is
rejected with a specific message.

## 2. Deploy and start

```bash
./deploy/scripts/up.sh
docker compose -f deploy/compose.yaml ps
```

**Expected**: gateway, runtime and TLS services are running; the gateway reports healthy; no cloud
account or external API is requested.

Re-run the deployment command. **Expected**: it is idempotent — no duplicate containers, no data
reset, and the same configuration digest.

## 3. Verify runtime readiness

```bash
nexphone status
```

**Expected**: `runtime.state` moves from `starting` to `ready`, `health` is `ok`, capabilities show
Android version, ABI list, display size and fps. A second `nexphone status` shows the same runtime
instance and the pinned image digest.

**Failure drill**: stop the runtime container directly and wait. **Expected**: status changes to
`restarting` or `failed`, an event is logged with a cause, and the restart policy is applied. No
data is deleted.

## 4. Pair the phone

1. Run `nexphone pair` on the host. It prints a single-use 8-digit code and its expiry.
2. On the phone, open `https://<host>:8443/`.
3. Accept or install the local certificate as documented, then enter the code.

**Expected**: pairing succeeds, the session token is stored by the client, and the live screen
appears. The code cannot be reused. A second pairing attempt while the session is active is refused
with `session_busy`.

**Failure drill**: enter a wrong code five times. **Expected**: rate limiting engages, the error
does not reveal whether a code exists, and no secret appears in logs.

## 5. Install, launch and stop an application

```bash
nexphone apps install ./fixtures/sample.apk
nexphone apps list
nexphone apps launch org.example.nexphone.sample
nexphone apps stop org.example.nexphone.sample
```

**Expected**: the app appears in the list with version and state; launching brings it to the
foreground without a launcher; stopping it leaves the runtime healthy.

**Failure drill**: install a corrupt or incompatible package. **Expected**: a normalized cause
category and remediation hint, with the runtime still ready.

## 6. Interact from the phone

In the browser session:

1. Tap a button in the app.
2. Swipe to scroll.
3. Focus a text field and type.
4. Rotate the phone or resize the browser window.

**Expected**: every interaction is reflected in the remote app; connection state is displayed;
coordinates remain correct after rotation or resize.

**Measurement**: record the reported input-to-display latency (p50 and p95) and the observed frame
rate. These values populate the M0 baseline; they are not compared against an invented target.

## 7. Persistence across runtime restart

1. Create data in the sample app (for example, a saved note).
2. `nexphone runtime restart`.
3. Wait for ready, relaunch the app.

**Expected**: the data is present. The runtime instance and image digest are unchanged.

## 8. Persistence across host reboot

1. Reboot the host normally.
2. Start the stack again.
3. Relaunch the app.

**Expected**: application data and configuration are intact. If the runtime was running during the
reboot, it recovers to a ready state or reports a clear failure.

**Failure drill**: make `storage.dataPath` read-only or remove it while non-empty, then start.
**Expected**: startup fails safely with a storage error; existing data is not deleted or
reinitialized.

## 9. Connection loss and reconnection

1. Start interacting on the phone.
2. Disable Wi-Fi for 10 seconds, then re-enable it.

**Expected**: the client shows `disconnected`/`reconnecting`, reconnects with backoff, requests a
new keyframe, and resumes the same session. The Android app keeps running.

**Failure drill**: revoke the session from the host while connected (`nexphone session revoke`).
**Expected**: screen and input stop immediately, the client returns to pairing, and no further
frames are delivered.

## 10. Runtime replacement check

1. Start the platform with the fake adapter used by the test suite.
2. Run the adapter contract suite.
3. Search the client and gateway source for runtime-specific identifiers.

**Expected**: the fake adapter passes the suite; the platform starts and serves status through
configuration alone; the search finds runtime-specific strings only inside the adapter directory.

## 11. Security and isolation checks

```bash
# Confirm the runtime is not privileged and has no host control socket
docker inspect <runtime-container> --format '{{json .HostConfig.Privileged}}'
docker inspect <runtime-container> --format '{{json .Mounts}}'
```

**Expected**: `Privileged` is `false`; mounts are limited to the configured data store and required
devices; no Docker socket; the container does not share the host PID or network namespace.

Also verify:

- Plain `http://` to the API is refused or redirected, and WebSocket upgrades require TLS.
- An untrusted certificate produces an explicit browser warning, never silent acceptance.
- Logs contain no tokens, pairing codes, certificate private material or screen content.

## 12. Clean stop

```bash
./deploy/scripts/down.sh
```

**Expected**: services stop cleanly, the runtime stops gracefully, and the data store remains.
Starting again returns to the ready state with the same data.

## Acceptance mapping

| Spec criterion | Validated by |
| --- | --- |
| FR-001–FR-006, SC-001 | Sections 0–3 |
| FR-007–FR-013 | Sections 3, 10, 11 |
| FR-014–FR-021, SC-003, SC-004 | Sections 5, 7, 8 |
| FR-022–FR-034, SC-005, SC-006, SC-011 | Sections 4, 6, 9 |
| FR-035–FR-040, SC-008 | Sections 10 |
| FR-041–FR-045, SC-007 | Sections 3, 9, 11 |
| FR-046–FR-054 | Sections 4, 11 |
| NFR-001–NFR-012 | Sections 3, 6, 7, 8, 10, 11 |
| SC-002, SC-010 | Section 6 measurements recorded in the baseline document |
| SC-009 | Section 2–6 with WAN connectivity disabled after setup |
