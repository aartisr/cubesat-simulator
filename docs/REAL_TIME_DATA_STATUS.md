# Real-Time Data Implementation Status

Last updated: 2026-10-10

This log tracks implementation against [the real-time data strategy](REAL_TIME_DATA_STRATEGY.md). A checked item is present in the codebase; it does **not** imply that a third-party account, credential, or mission gateway has been configured in a deployment.

| Stage | Status | Delivered outcome |
| --- | --- | --- |
| 0 — Provenance foundation | Complete | Source modes, provenance/freshness states, local settings, simulated fallbacks, and the Data Sources workspace. |
| 1 — Public live context | Complete | Vercel server-side adapters for NOAA SWPC, CelesTrak OMM/JSON, and IERS EOP; bounded input, validation, cache headers, and graceful unavailable states. |
| 2 — Reproducible replay | Complete | Local JSON replay-bundle import with validation, stored manifest, and provenance-aware status. |
| 3 — Authenticated providers | Complete, configuration required | Server-only readiness endpoints for Space-Track and Earthdata. They remain unavailable until Vercel environment variables are configured. |
| 4 — Mission gateway | Complete, gateway required | Server-only mission connection status and authorized polling boundary. Continuous MQTT/NTRIP/WebSocket ingestion remains an external gateway responsibility. |
| 5 — Verification and reproducibility | Core complete | Replay SHA-256 provenance, scenario-manifest export, runtime source modes, and build/type validation. Mission-specific numerical validation remains an engineering activity. |

## Deployment checklist

- [ ] Deploy this revision to Vercel.
- [ ] Confirm `/api/feeds/space-weather`, `/api/feeds/orbit?id=25544`, and `/api/feeds/eop` return envelopes from the deployed domain.
- [ ] Enable only the desired public-context source in **Data Sources** and verify timestamps/freshness labels.
- [ ] Configure any optional credentials in Vercel Project Settings → Environment Variables; never add them to source control or `VITE_*` variables.
- [ ] If using a mission gateway, configure its fixed server-side URL and bearer credential, verify its schema, then confirm it is displayed as `MISSION TELEMETRY` only after a successful authenticated response.
- [ ] Review each provider's terms, attribution, rate limits, retention, and allowed use before enabling it for users.

## Environment variables for optional stages

| Variable | Stage | Purpose |
| --- | --- | --- |
| `SPACE_TRACK_USERNAME` and `SPACE_TRACK_PASSWORD` | 3 | Server-side Space-Track session only. |
| `EARTHDATA_TOKEN` | 3 | Server-side Earthdata protected-data access only. |
| `MISSION_TELEMETRY_API_URL` | 4 | Fixed HTTPS endpoint for a project-controlled telemetry gateway. |
| `MISSION_TELEMETRY_BEARER_TOKEN` | 4 | Server-side credential sent only to that configured gateway. |

No credential is needed for the default simulated mode or the public Stage 1 feeds.

The mission response schema and secret-rotation process are defined in [MISSION_GATEWAY_CONTRACT.md](MISSION_GATEWAY_CONTRACT.md).

## Known intentional limits

- Astroneer does not use public catalogue data as flight-qualified ephemeris or operational collision-screening output.
- The Vercel function layer is request/response oriented. It is not a durable MQTT, NTRIP, or long-lived WebSocket ingestor.
- Live feeds are optional context. A provider failure results in an explicit stale/unavailable state and does not stop the simulator.

## Verification record

- 2026-10-10: `npm run lint` passed.
- 2026-10-10: All new Vercel Function modules passed `node --check`.
- 2026-10-10: Using Node 22.19.0 and the public npm registry, `npm ci`, `npm run lint`, and `npm run build` all passed. The local Vite server is available at `http://localhost:3002` because ports 3000 and 3001 were already in use.
- 2026-10-10: Added deterministic regression coverage for simulator state, physics, vehicle geometry, replay validation, feed adapters, request guards, cache policies, and mission-gateway validation. `npm run test:all` passed: 22 tests, type-check, and production build.
