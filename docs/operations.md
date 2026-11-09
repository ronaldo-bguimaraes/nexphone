# Operations

## Status

The CLI needs the operator token, which lives in the gateway state volume:

```bash
export NEXPHONE_URL=https://<host>:8443
export NEXPHONE_OPERATOR_TOKEN=$(
  docker compose --env-file deploy/.env -f deploy/compose.yaml \
    exec -T gateway cat /state/operator-token | tr -d '\r\n'
)

npm run cli -w backend -- status
npm run cli -w backend -- runtime status
```

The status view reports the runtime state and health, adapter and contract version, storage state,
active session count and measured input-handling latency.

## Runtime lifecycle

```bash
... runtime start
... runtime stop
... runtime restart
```

Start is asynchronous. Poll `status` until `runtime.state` is `ready`. A failure sets
`runtime.lastError` with a code, message and remediation hint.

## Applications

```bash
... apps list
... apps install ./app.apk
... apps launch org.example.app
... apps stop org.example.app
```

Launching resolves the launcher intent directly; no home screen is required.

## Sessions

```bash
... pair                      # issue a single-use code
... session revoke <sessionId>
```

Only one interactive session is allowed in M0. Revocation closes an active WebSocket immediately.

## Logs

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f gateway
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f caddy
```

The gateway emits structured JSON. Tokens, pairing codes, certificate material and screen content
are redacted. Retention is controlled by `logging.retentionDays`.

Runtime logs:

```bash
docker logs nexphone-runtime --tail 200
```

## Persistent data

| Data | Location | Survives |
| --- | --- | --- |
| Android application data | Docker volume `nexphone-data`, mounted at `/data` | Runtime, gateway and host restarts |
| Sessions and pairing state | Docker volume `nexphone-state`, at `/state` | Gateway restarts |
| TLS materials | Caddy volumes | Restarts |

### Backup

Stop the runtime first so Android is not writing:

```bash
... runtime stop
docker run --rm -v nexphone-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/nexphone-data.tar.gz -C /data .
```

Restore into a fresh deployment with the runtime stopped, then start it and check the storage state
in `status`.

### Unclean shutdown

If the host stops without a clean runtime stop, the store contains `.nexphone-running`. NexPhone
reports `storage.state=inconsistent` and refuses to start the runtime automatically. Inspect the
data, keep a copy, and remove the marker only when you accept the risk of starting from that state.

## Offline check

After setup, disable the host's WAN connection (keep the LAN) and repeat start, launch and pair.
Everything must still work. If it does not, capture `status` and the gateway logs.

## Upgrades

1. Stop the runtime.
2. Back up the data volume.
3. Update the pinned image digest and rebuild the gateway.
4. Start the runtime and verify the application data.
