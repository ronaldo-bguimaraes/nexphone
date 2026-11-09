# Troubleshooting

## Preflight fails

| Symptom | Cause | Fix |
| --- | --- | --- |
| `/dev/kvm is missing` | Virtualization disabled or nested virtualization unavailable | Enable VT-x/AMD-V in firmware; on a VM enable nested virtualization. |
| `/dev/kvm is not accessible` | User not in the `kvm` group | `sudo usermod -aG kvm $USER`, then log in again. |
| `Android binder is unavailable` | `binder_linux` not loaded or binderfs not mounted | Load the module and mount binderfs as documented in `deployment.md`. |
| `Docker Engine not reachable` | Service down or permission denied | Start Docker and add the user to the `docker` group. |
| `Runtime image is not pinned` | `deploy/.env` uses a tag | Run `pin-image.sh` and paste the digest. |

## Runtime does not become ready

1. Check `status` for `runtime.lastError`.
2. Inspect `docker logs nexphone-runtime --tail 200`.
3. Verify the image digest and that the host has enough memory and disk.
4. If isolation was loosened manually, restore `Privileged: false`; the project does not support
   privileged runtime containers.

`READY_TIMEOUT` means boot did not complete within the budget. Check resources first; repeated
timeouts on a small host are expected.

## Runtime crash loop

`runtime.state=failed` after the restart budget means the container exits repeatedly. The status
includes a normalized error. Collect logs, verify the pinned image, and check for host resource
exhaustion. NexPhone never deletes the data volume automatically.

## Storage errors

| State | Meaning | Action |
| --- | --- | --- |
| `missing` | Data path does not exist | NexPhone creates an empty store on first start. |
| `read-only` | Service user cannot write | Fix ownership and permissions. |
| `unsafe` | Symlink, not a directory, or inaccessible | Point `storage.dataPath` at a real, dedicated directory. |
| `inconsistent` | Previous runtime stopped uncleanly | Back up and inspect the data before clearing the marker. |

## Pairing fails

- Codes are single-use and expire after five minutes; request a new one.
- Five failed attempts per minute trigger rate limiting; wait a minute.
- A session is already active: revoke it first.
- Clock skew can invalidate sessions; ensure the host clock is synchronized.

## Phone cannot connect

- Confirm the phone is on the same LAN and the host firewall allows TCP 8443.
- Install the Caddy root certificate; do not bypass the warning.
- Check that Caddy is running and `https://<host>:8443/api/health` responds.
- WebSocket upgrades require TLS; plain `http://` will not work.

## Screen is black or frozen

- Check that the runtime is `ready` and an application is running.
- Reconnect the client; it requests a fresh keyframe automatically.
- Verify the scrcpy server version matches the pinned server in the gateway image.
- Software rendering with a very small host may drop frames; check CPU usage.

## Input is offset

Coordinates are scaled to the video size reported by the stream. Rotate or resize once to refresh
the geometry, then retry. Out-of-bounds input is rejected rather than clamped.

## Logs contain no secrets

If you find a token or pairing code in a log, treat it as a security issue and report it privately
as described in `SECURITY.md`.
