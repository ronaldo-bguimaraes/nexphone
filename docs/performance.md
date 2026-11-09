# Performance baseline

**Status**: Pending measurement on the reference host. No target is asserted before measurement.

The specification deliberately avoids invented performance targets. The implementation records:

- Input-to-display latency as observed by the client (estimated until a display-timestamp
  acknowledgement is added).
- Input-handling latency at the gateway (`latency.p50Ms` and `latency.p95Ms` in `/api/status`).
- Frame rate and dropped-frame behavior under backpressure.
- Host CPU, memory and disk use at idle and while streaming 720×1280 at 30 fps.

## How to measure

1. Deploy on the reference host and pair a phone on a wired or strong Wi-Fi LAN.
2. Run the streaming integration test:
   `NEXPHONE_INTEGRATION=1 npm run test:integration -w backend`.
3. Record `inputLatencyMs` from `GET /api/status` after a scripted tap/swipe/text sequence.
4. Use `docker stats nexphone-runtime` and `htop` for resource use.
5. Repeat in `gpuMode: guest` and, if available, `gpuMode: host`.

## Reference setup to record

| Item | Value |
| --- | --- |
| Host CPU | _pending_ |
| Host RAM | _pending_ |
| Host disk | _pending_ |
| GPU / render node | _pending_ |
| LAN link | _pending_ |
| Phone model / browser | _pending_ |
| Runtime image digest | _pending_ |
| Android version | _pending_ |
| Latency p50 / p95 | _pending_ |
| Effective fps | _pending_ |
| Idle / active CPU | _pending_ |
| Idle / active RAM | _pending_ |

The measured values become the M0 acceptance threshold. Do not copy numbers from other projects.
