# Astroneer Architecture and Extension Guide

Astroneer is organized so a new capability can be added at a clear boundary without coupling UI code to orbital physics, browser state, credentials, or third-party response shapes.

## Module boundaries

| Layer | Location | Responsibility |
| --- | --- | --- |
| Application composition | `src/App.tsx` | Provider setup, physics loop, workspace selection, and top-level layout only. |
| Workspaces | `src/modules/` | User-facing subsystem experiences; compose components and select state. |
| Reusable components | `src/components/` | Presentational views and narrowly scoped interactions. |
| Simulation state | `src/core/store/useSimulatorStore.ts` | Deterministic simulation state, actions, and time-step integration. |
| Physics | `src/core/math/` | Pure mathematical models with typed inputs/outputs. No DOM, fetch, or React imports. |
| Static data | `src/core/data/` | Curated presets and fixed reference data. |
| Client services | `src/services/` | Fetching, cache/query integration, local user settings, replay validation, and provenance. |
| Shared contracts | `src/types/` | Domain and data-source types shared across UI/service/model code. |
| Vercel functions | `api/` | Server-only external access, parameter validation, secret use, payload normalization, caching, and graceful failures. |

### Workspace plug-in seam

`src/modules/workspaces.tsx` is the single workspace registry. It owns the workspace identifier, navigation metadata, primary/overflow placement, icon, lazy renderer, and loading boundary. To add a workspace, create its module and add one `WorkspaceDefinition` there; the app shell and navigation pick it up automatically. A workspace may accept the typed `onNavigate` callback only when it needs to link to another workspace.

`src/core/react/usePhysicsClock.ts` owns request-animation-frame scheduling and delta-time bounds. Simulation integration stays in the store; UI composition must not create a competing clock.

## Reusable primitives

- `components/charts/ChartNavigator.tsx` provides the lossless Recharts navigation control and its user hint. New Recharts time/profile charts should use it instead of adding a new `Brush` configuration.
- `components/charts/ChartViewport.tsx` provides the consistent full-screen inspection mode. New data charts should use it so expand, Escape-to-close, focus handling, and scroll locking remain uniform.
- `components/dataSources/DataSourceFeedCard.tsx` standardizes provider mode, provenance, freshness, and source status presentation.
- `api/_feed.js` contains the common response envelope, unavailable state, request-method guard, date selection helper, and bounded upstream fetch.

## Vehicle-geometry contract

`src/core/data/tleCatalog.ts` is the single source of truth for each vehicle profile. A `SatellitePreset` carries its form factor, stowed body dimensions, drag reference areas, deployed solar-wing dimensions, mass, battery capacity, and solar capacity. The store passes that same geometry into solar, thermal, drag, propulsion, and 3D visualization paths.

The default **Astroneer** profile is a conceptual **1U** virtual twin (100 × 113.5 × 100 mm, 1.25 kg, 10 Wh, 5 W). It is a simulation baseline, not a claim about an as-built or flight-qualified spacecraft. Keep new vehicle-specific assumptions in the preset; do not introduce a fixed 3U/6U constant in a component or physics module.

## Adding a public context feed

1. Define the output shape in `src/types/dataSources.ts` if it is shared by UI code.
2. Implement a single adapter under `api/feeds/`. Validate every parameter; call only a fixed upstream URL/shape; use `fetchWithTimeout`; return a `FeedEnvelope` through `success` or `unavailable`.
3. Add a query through `fetchFeed` / `useFeed` in `src/services/dataSources.ts`.
4. Present it through `DataSourceFeedCard`, including clear language about whether it informs a model or is context only.
5. Keep the deterministic fallback. A feed failure must never stop simulation time, throw in rendering, or expose an upstream error/credential.

## Adding a credentialed provider

1. Add only server-side environment-variable names to `.env.example`; never use `VITE_*` for a secret.
2. Add an unavailable/configuration state before adding a live request.
3. Document terms, rate limit, caching rule, source attribution, freshness threshold, and secret owner.
4. Validate and normalize payloads at the Vercel function boundary. The browser sees only the public `FeedEnvelope`.
5. Add a replay fixture before using a provider result as a model input.

## Reliability rules

- External fetches are bounded by `fetchWithTimeout` and return an explicit unavailable envelope on failure.
- The default simulator path is network-independent.
- Replays retain source time, source URL, and SHA-256 provenance; scenario manifests export active model/source settings.
- Chart navigation is index-based and does not mutate or resample telemetry.
- Mission telemetry is read-only and follows [the gateway contract](MISSION_GATEWAY_CONTRACT.md).

## Regression suite

Run `npm test` for deterministic, network-isolated regression tests or `npm run test:all` before release to also type-check and create the production build.

| Test area | Contract protected |
| --- | --- |
| `tests/physics.test.ts` | Kepler residuals, propagated orbital-state validity, atmospheric-density response, and sunlight/umbra geometry. |
| `tests/data-sources.test.ts` | Replay-manifest validation, live-context shape guards, and SHA-256 provenance checksums. |
| `tests/api-functions.test.ts` | Vercel request guards, NOAA/CelesTrak/IERS normalization, cache directives, graceful upstream failures, and mission-gateway boundary validation. |
| `tests/simulator-store.test.ts` | Atomic state updates, subsystem synchronization, safe satellite switching, telemetry recording, and CSV export. |
| `tests/cubesat-geometry.test.ts` | Astroneer 1U geometry, larger-profile separation, and geometry-derived solar-face areas. |

Tests mock every upstream service. They must remain deterministic and must never require provider credentials or a network connection.

## Deliberate non-goals

The browser app is not a command system, a durable message broker, or a flight-qualified orbit/conjunction authority. Continuous NTRIP, MQTT, or WebSocket ingestion belongs in a dedicated mission gateway; Astroneer consumes normalized, authenticated results through its server-side boundary.
