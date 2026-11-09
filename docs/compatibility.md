# Compatibility and limitations

NexPhone M0 targets Android 14 (API 34) on x86_64 with the provisional Redroid runtime. The exact
image is pinned per deployment; capabilities are reported at runtime.

## What works

- Applications that do not depend on Google services or hardware-backed features.
- x86_64 APKs.
- ARM APKs only when the pinned image includes a native bridge; this is not guaranteed.
- Direct install, launch and stop without a launcher.
- Persistent application data across restarts.

## Known limitations

- **Google Play Services / Play Integrity**: applications may install but fail at runtime. NexPhone
  does not include proprietary Google components.
- **Hardware-backed keystore, biometrics, StrongBox**: not available or simulated; applications
  relying on them may refuse to run.
- **NFC, cellular radio, GPS, camera hardware**: absent or simulated.
- **DRM video**: may refuse to play on a virtual device.
- **ARM-only applications**: depend on native bridging and may fail.
- **Software rendering**: lower frame rate and higher CPU use; GPU passthrough is optional and
  hardware-dependent.
- **Single session, single runtime**: intentional M0 constraints.
- **No audio forwarding**: video and input only.

## Verifying an application

1. Install it: `... apps install app.apk`.
2. Launch it: `... apps launch <packageId>`.
3. Interact from the phone and check the runtime logs for crashes.
4. If it fails, capture the normalized error and the package's requirements before filing an issue.

Capabilities reported by the runtime (`androidVersion`, `apiLevel`, `abiList`, `features`) are the
source of truth for what the environment supports.
