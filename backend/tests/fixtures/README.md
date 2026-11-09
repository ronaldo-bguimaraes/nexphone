# Integration fixtures

The real-runtime integration suite is excluded from default CI. It requires a KVM-capable Ubuntu
host with binder and a running NexPhone deployment.

## Sample APK

Place a permissively licensed, Play-Services-free APK at `backend/tests/fixtures/sample.apk` and
record its checksum:

```bash
sha256sum backend/tests/fixtures/sample.apk >> backend/tests/fixtures/checksums.txt
```

The file is intentionally not committed because APK binaries are large and their licensing and
provenance must be reviewed per release. `checksums.txt` pins whatever fixture the operator adds.

Verify the fixture before running the suite:

```bash
sha256sum -c backend/tests/fixtures/checksums.txt
```

## Running the suite

```bash
NEXPHONE_INTEGRATION=1 \
NEXPHONE_CONFIG=config/nexphone.yaml \
NEXPHONE_SAMPLE_APK=backend/tests/fixtures/sample.apk \
npm run test:integration -w backend
```
