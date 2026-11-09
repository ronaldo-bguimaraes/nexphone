# Deployment

NexPhone M0 runs on a single Ubuntu 24.04 LTS host and is used from a phone browser on the same
local network. Nothing is sent to a cloud service.

## Supported host

- Ubuntu 24.04 LTS, x86_64.
- Hardware virtualization enabled (KVM).
- Android binder available to the host kernel.
- Docker Engine 27+ with Compose v2.
- At least 4 vCPU, 8 GiB RAM and 20 GiB free disk (measured baseline recorded in
  `docs/performance.md`).
- A phone on the same LAN with a current Chrome or Edge browser.

## 1. Prepare the kernel

```bash
sudo apt update
sudo apt install -y linux-modules-extra-$(uname -r) adb
sudo modprobe binder_linux devices=binder,hwbinder,vndbinder
sudo mkdir -p /dev/binderfs
sudo mount -t binder binder /dev/binderfs
```

Make binder persistent across reboots:

```bash
echo "binder_linux" | sudo tee /etc/modules-load.d/nexphone.conf
echo "options binder_linux devices=binder,hwbinder,vndbinder" | \
  sudo tee /etc/modprobe.d/nexphone.conf
```

`ashmem` is not required on modern kernels; NexPhone enables `memfd` instead.

## 2. Configure

```bash
cp deploy/.env.example deploy/.env
cp config/nexphone.example.yaml config/nexphone.yaml
```

Pin the runtime image to a digest:

```bash
./deploy/scripts/pin-image.sh redroid/redroid:14.0.0_64only-latest
```

Put the printed `name@sha256:...` into both `deploy/.env` (`NEXPHONE_RUNTIME_IMAGE`) and
`config/nexphone.yaml` (`runtime.image`). Floating tags are rejected by the configuration schema.

Review `config/nexphone.yaml`:

- `host.binding`: `lan` (default) or `loopback`.
- `host.port`: public HTTPS port, default `8443`.
- `storage.dataPath`: container path for Android data, default `/data`.
- `storage.statePath`: container path for gateway state, default `/state`.
- `runtime.display`: default 720×1280 at 30 fps.
- `runtime.gpuMode`: `guest` (software) or `host` (needs a compatible `/dev/dri`).

## 3. Deploy

```bash
./deploy/scripts/preflight.sh
./deploy/scripts/up.sh
```

The gateway creates and manages the Android runtime container (`nexphone-runtime`) on demand. The
`runtime` service in `deploy/compose.yaml` is optional and only used with
`--profile runtime`.

The deployment is idempotent: re-running `up.sh` rebuilds the gateway image and leaves the data and
state volumes untouched.

## 4. Trust the local certificate

Caddy issues a certificate from its internal CA. On the phone, install Caddy's root certificate as
documented for your OS, then open:

```
https://<host-ip>:8443/
```

An untrusted certificate produces a browser warning and is never silently accepted.

## 5. Start and pair

The operator token lives inside the `nexphone-state` volume. Export it for the CLI:

```bash
export NEXPHONE_URL=https://<host-ip>:8443
export NEXPHONE_OPERATOR_TOKEN=$(
  docker compose --env-file deploy/.env -f deploy/compose.yaml \
    exec -T gateway cat /state/operator-token | tr -d '\r\n'
)

npm run cli -w backend -- runtime start
./deploy/scripts/status.sh
npm run cli -w backend -- pair
```

Enter the printed 8-digit code in the phone browser. The code is single-use and expires after five
minutes.

## Ports

| Port | Exposure | Purpose |
| --- | --- | --- |
| 8443 | LAN | HTTPS and WebSocket through Caddy |
| 8080 | internal | Gateway HTTP (inside the Compose network) |
| 5555 | internal | ADB from the runtime container; never publish publicly |

## No cloud dependency

After the initial image pull and package installation, normal operation requires no internet
access, account or third-party API. See `docs/operations.md` for the offline check.
