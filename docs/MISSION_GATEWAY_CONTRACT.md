# PCSS II Mission Gateway Contract

This contract defines the only accepted shape for mission-controlled telemetry returned to `GET /api/mission/telemetry`. It is intentionally read-only: PCSS II does not issue spacecraft commands.

## Transport

- The gateway URL is configured only as `MISSION_TELEMETRY_API_URL` in Vercel.
- It must use HTTPS.
- PCSS II sends the server-side `MISSION_TELEMETRY_BEARER_TOKEN` as a Bearer token. The token is never returned to the browser.
- The gateway must return JSON with `Content-Type: application/json`.

## Required response envelope

```json
{
  "observedAt": "2026-10-10T21:03:40.000Z",
  "quality": "NOMINAL",
  "data": {
    "batterySocPercent": 83.4,
    "batteryVoltageV": 8.12,
    "temperatureC": 21.7
  }
}
```

| Field | Type | Requirement |
| --- | --- | --- |
| `observedAt` | ISO-8601 UTC timestamp | Required; it is the time the measurement occurred, not the gateway response time. |
| `quality` | `NOMINAL`, `SUSPECT`, `DEGRADED`, or `UNAVAILABLE` | Required. |
| `data` | JSON object | Required; mission-defined measurement values only. |
| `sequence` | integer | Optional but recommended. Monotonically increasing within a telemetry stream. |
| `receivedAt` | ISO-8601 UTC timestamp | Optional. Time the gateway received the packet. |
| `expiresAt` | ISO-8601 UTC timestamp | Optional. After this point PCSS II labels the result stale. |
| `units` | object | Optional but recommended. A map such as `{ "batteryVoltageV": "V" }`. |
| `schemaVersion` | string or integer | Optional but recommended. |

PCSS II rejects malformed timestamps, unrecognized quality values, non-object `data`, and responses larger than the gateway's documented payload budget. A gateway should retain raw packet records separately from any derived state estimate.

## Gateway responsibilities

1. Authenticate the originating ground segment and validate any webhook signature or mTLS/OAuth identity.
2. Normalize packet time scales to UTC and preserve the raw time field separately when needed.
3. Detect duplicate, out-of-order, missing, and stale sequence numbers before publishing a latest-state response.
4. Validate units and ranges for every mission-defined field.
5. Apply least-privilege credentials, rotation, logging redaction, and rate limits.
6. Expose no command endpoint through this PCSS II integration.

## Activation and rotation runbook

1. Add `MISSION_TELEMETRY_API_URL` and `MISSION_TELEMETRY_BEARER_TOKEN` to Vercel Project Settings for Preview and Production as appropriate.
2. Deploy a new revision; Vercel environment changes apply to new deployments.
3. Open **Sources** in PCSS II and confirm the mission gateway reports `NOMINAL` only after a valid server-side response.
4. Rotate the bearer token in the gateway first, then replace the Vercel secret, deploy, and verify the new connection.
5. If compromise is suspected, disable the gateway URL or revoke the token immediately. Do not place secrets in a replay file, `.env.example`, browser storage, or source control.

## Explicit limits

Vercel Functions are suitable for a short authenticated poll as implemented here. They are not a durable MQTT, NTRIP, or long-lived WebSocket ingestion service. Run those transports in a dedicated gateway and give PCSS II only the normalized read API described above.
