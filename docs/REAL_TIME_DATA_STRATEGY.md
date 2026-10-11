# PCSS II CubeSat Simulator: Real-Time Data and High-Fidelity Roadmap

> **Purpose.** This document defines how PCSS II can evolve from a deterministic educational simulator into a transparent hybrid digital twin. It is an engineering-exploration plan, not a flight-operations design or a source of command authority.

## 1. The central design decision

PCSS II should preserve two separate concepts:

- **Simulation truth** is the internally propagated state: orbit, attitude, electrical power, thermal state, communications, and fault model.
- **Observations** are time-stamped data obtained from an outside source: a public catalogue, space-weather service, ground-station gateway, or a recorded telemetry set.

External data must never silently overwrite the model. It can initialize a scenario, constrain an estimate, or appear beside a prediction. This distinction keeps the experience believable and prevents a public orbital catalogue, a delayed weather index, or an unavailable API from being represented as live spacecraft telemetry.

Every value originating outside the simulator must display one of these provenance states:

| Badge | Meaning |
| --- | --- |
| `SIMULATED` | Produced solely by the PCSS II model. |
| `LIVE CONTEXT` | A current outside observation informs context but does not claim to be spacecraft telemetry. |
| `REPLAY` | Recorded historical data, shown against its original event time. |
| `MISSION TELEMETRY` | Authenticated data from a mission-controlled gateway. |
| `STALE` | The last usable observation is older than its allowed age. |
| `UNAVAILABLE` | No trustworthy observation is available; the simulator has fallen back to the selected scenario. |

The UI should always show the provider, source time, retrieval time, refresh policy, quality state, and whether the data was used for display, initialization, or estimation.

## 2. What “very realistic” should mean

Realism is not a large collection of feeds. It is a coherent model that makes uncertainty, latency, and limitations visible.

### 2.1 Physics and estimation improvements

1. **Orbit propagation:** Use SGP4 with current GP/OMM elements when catalog data is selected. Retain the existing Kepler + J2 model as an explicit educational mode. Support a higher-fidelity numerical propagator only when its force models and reference frames are stated.
2. **Frames and time:** Make UTC, UT1, TT, TEME, GCRF/J2000, ITRF/ECEF, leap seconds, and Earth-orientation parameters explicit. Do not treat all "ECI" values as interchangeable.
3. **Atmosphere and drag:** Drive an atmosphere model with current solar and geomagnetic context, then publish density uncertainty and ballistic-coefficient assumptions. A real Kp or F10.7 feed improves context; it does not measure a particular CubeSat's drag.
4. **Attitude and sensors:** Add realistic star-tracker, Sun-sensor, magnetometer, gyro, GNSS, wheel-tachometer, and temperature-sensor errors: bias, quantization, noise, saturation, dropout, latency, and calibration drift.
5. **Estimation:** Use an EKF/UKF or batch estimator only after measurements, covariance, frame, and time-scale handling are defined. Keep the state estimate and the raw observation separate.
6. **Power and thermal:** Couple eclipse geometry, albedo/IR assumptions, panel degradation, heater logic, battery temperature and state-of-charge limits. Expose parameter ranges rather than presenting one predicted temperature as exact.
7. **Communications:** Model antenna pattern, attitude loss, Doppler, free-space loss, station elevation mask, coding/modulation, packet loss, contact scheduling, and ground-side queue delay.
8. **Conjunction context:** Treat catalogue-based screening as awareness only. Do not label it a maneuver recommendation or operational collision-avoidance service.

### 2.2 Fidelity levels

| Level | Intended use | Inputs | Example output wording |
| --- | --- | --- | --- |
| Scenario | Learning and design trade studies | User-selected assumptions | “Predicted under the selected scenario.” |
| Contextual | A current, public-world backdrop | Public orbit/environment feeds | “Live context, updated at …” |
| Replay | Reproducible analysis or demonstrations | Frozen data bundle | “Recorded data from …” |
| Mission-connected | A mission team's authenticated data | Controlled gateway and credentials | “Mission telemetry received at …” |

Only the fourth level may use the phrase **mission telemetry**. None of these levels is flight-qualified by virtue of being present in a browser.

## 3. Data-source catalogue

The catalogue below is deliberately broad. A provider should be enabled only after confirming its current terms, rate limits, attribution, availability, and suitability for the intended use.

### 3.1 Orbit, catalogue, and conjunction context

| Source | Data useful to PCSS II | Access class | Recommended use | Important constraints |
| --- | --- | --- | --- | --- |
| [CelesTrak GP data](https://celestrak.org/NORAD/documentation/gp-data-formats.php) | General-perturbations elements in OMM, JSON, CSV, XML, KVN, and legacy TLE formats | Public | Selected object orbit initialization; ground track; pass prediction | Prefer OMM/JSON. Legacy TLE fields cannot represent catalog numbers above 99,999. Cache and follow the [usage policy](https://celestrak.org/usage-policy.php). |
| [CelesTrak SATCAT](https://celestrak.org/satcat/satcat-format.php) | Object identity, launch and catalogue metadata | Public | Satellite selector and object metadata | Catalogue metadata is not telemetry. |
| [CelesTrak SOCRATES Plus](https://celestrak.org/SOCRATES/socrates-format.php) | Close-approach screening context | Public | Educational conjunction display | Not a substitute for an operator's authoritative screening workflow. |
| [Space-Track](https://www.space-track.org/documentation) | GP, historical GP, SATCAT and other USSPACECOM-distributed basic SSA data | Account / terms | Authenticated research or operator-facing context | Keep credentials server-side; honor the user agreement, query limits, attribution, and redistribution rules. |
| [ESA DISCOSweb](https://discosweb.esoc.esa.int/) | Space-object, launch, and registration information | Account / terms | Rich object and launch metadata | ESA notes that surveillance orbital/attitude ephemerides are not distributed through DISCOSweb. |
| [IERS EOP data](https://data.iers.org/eop.php) | UT1–UTC, polar motion, nutation corrections, and predictions | Public | High-fidelity frame/time conversion | EOP are model inputs, not spacecraft state observations. Track bulletin/version and prediction age. |
| [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Solar-system ephemerides and observer geometry | Public | Sun/Moon/planet geometry for illumination and perturbation studies | Cache results; do not make it a per-frame browser call. |
| [NASA JPL Small-Body Database API](https://ssd-api.jpl.nasa.gov/doc/sbdb.html) | Small-body physical/orbital metadata | Public | Optional celestial-context visualizations | Not needed for core Earth-orbit propagation. |

**Implementation note:** CelesTrak's modern GP documentation recommends OMM-compatible formats and provides a parameterized query endpoint. Fetch only the selected object or explicitly selected group. CelesTrak states GP data updates every two hours and asks users not to query more than once per hour. Use a server cache with a conservative refresh interval; do not fan out a browser request for every visitor.

### 3.2 Solar, space weather, ionosphere, and thermosphere

| Source | Data useful to PCSS II | Access class | Recommended use | Important constraints |
| --- | --- | --- | --- | --- |
| [NOAA SWPC JSON products](https://services.swpc.noaa.gov/json/) | Planetary Kp, F10.7, solar wind, flare and alert products | Public | Drag, radiation, comms, and environmental-context cards | Mark source time and index cadence. These are environmental inputs, not on-board measurements. |
| [NOAA SWPC summary products](https://services.swpc.noaa.gov/products/summary/) | Compact 10 cm flux, solar-wind speed, and magnetic-field summaries | Public | Lightweight dashboard feed | Use for display/context; retain the full product for scientific processing where needed. |
| [NOAA SWPC 3-day forecast](https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json) | Forecast planetary Kp | Public | Scenario branching and forecast uncertainty | Clearly label as forecast, never as observation. |
| [NASA DONKI](https://api.nasa.gov/) | Space-weather event notifications, coronal mass ejections, flares, and geomagnetic storms | API key | Event timeline and replay | Use an API key in a server-side environment variable; validate event update/analysis time. |
| [NASA OMNIWeb](https://omniweb.gsfc.nasa.gov/) | Near-Earth solar-wind and geomagnetic parameters, including historical data products | Public / research | Scientific replay and environment comparison | Verify latency, cadence, and provenance for each chosen data product. |
| [NASA CDAWeb](https://cdaweb.gsfc.nasa.gov/) | Heliophysics and space-physics data discovery/access | Public / research | Advanced replay and data exploration | Prefer offline/replay ingestion over a UI polling path. |
| [ESA Space Weather Service Network](https://swe.ssa.esa.int/) | European space-weather service products and alerts | Public / registration varies | Cross-checking and alert context | Review provider-specific access and service limitations before integration. |
| [Kyoto World Data Center for Geomagnetism](https://wdc.kugi.kyoto-u.ac.jp/) | Dst and related geomagnetic indices | Public / research | Geomagnetic-storm replay and model evaluation | Preserve the specific index release and sampling interval. |
| [International Reference Ionosphere](https://irimodel.org/) | Ionosphere model and coefficients | Public model | Baseline ionosphere simulation | This is a model, not a real-time feed. Version it as a simulator dependency. |
| [GFZ Kp index](https://kp.gfz.de/) | Kp-related index products | Public / research | Cross-validation or historical replay | Confirm the product and latency that match the use case. |

### 3.3 GNSS, geodesy, atmosphere, and radio occultation

| Source | Data useful to PCSS II | Access class | Recommended use | Important constraints |
| --- | --- | --- | --- | --- |
| [International GNSS Service Real-Time Service](https://www.igs.org/rts/) | Multi-GNSS real-time orbit, clock, bias, and ionospheric corrections | Subscription / terms | Advanced GNSS receiver and PPP simulation | Streams use NTRIP and require registration/terms. Parse through a dedicated gateway, not in the browser. |
| [IGS RTS user access](https://www.igs.org/rts/user-access/) | Caster registration and stream access details | Registration | Connection setup | Never expose NTRIP credentials to a client bundle. |
| [IGS RTS products](https://www.igs.org/rts/products/) | IGS-SSR correction content and broadcast ephemeris stream descriptions | Subscription / terms | GNSS fidelity model | Maintain a native decoder/service; browsers should receive normalized results only. |
| [NASA CDDIS](https://cddis.nasa.gov/) | GNSS, geodetic, laser-ranging, VLBI and related archives | Earthdata Login / terms | Historical reference data and replay | Use asynchronous ingestion; archive source metadata with every replay dataset. |
| [NASA Earthdata CMR](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html) | Search and discovery for Earth-science data collections/granules | Public discovery; protected data may need token | Discover GNSS-RO, atmospheric, cloud, and Earth-observation data | CMR is primarily discovery metadata. Treat downloaded science data as delayed/replay data unless its product latency proves otherwise. |
| [COSMIC Data Analysis and Archive Center](https://cdaac-www.cosmic.ucar.edu/) | GNSS radio-occultation products and related science data | Registration / research | GNSS-RO replay and profile validation | Preserve retrieval version, quality flags, occultation geometry, and original time. |
| [EUMETSAT Data Store](https://data.eumetsat.int/) | Meteorological satellite and atmospheric data | Account / terms | Cloud/atmospheric context and replay | Product availability, license, and latency differ by collection. |
| [Copernicus Data Space Ecosystem](https://documentation.dataspace.copernicus.eu/) | Sentinel data access and processing APIs | Account / terms | Earth-observation context, replay, and imagery overlays | Large products need background jobs, spatial subsetting, and an explicit data budget. |
| [NASA GIBS](https://www.earthdata.nasa.gov/eosdis/science-system-description/eosdis-components/gibs) | Global imagery through standard map services | Public | Fast visual Earth-context layer | Imagery is a visual layer, not an environmental measurement at the spacecraft. |
| [USGS Earthquake API](https://earthquake.usgs.gov/fdsnws/event/1/) | Near-real-time seismic events | Public | Optional disaster-monitoring mission scenario | This is contextual event data, unrelated to spacecraft health. |

### 3.4 Earth environment, radiation, imagery, and mission context

| Source | Data useful to PCSS II | Access class | Recommended use | Important constraints |
| --- | --- | --- | --- | --- |
| [NOAA NCEI](https://www.ncei.noaa.gov/) | Climate, ocean, geophysical, and solar/space-weather archives | Public / product dependent | Historical environment replay | Use named datasets and versioned downloads, not generic scraping. |
| [NOAA GOES-R data](https://www.noaa.gov/jetstream/goes-r-series) | Weather imagery and selected space-weather observations | Public / product dependent | Earth/weather visualization and replay | Product endpoints and latency vary. Validate the precise product before productizing. |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) | Near-real-time active-fire context | API key / terms | Disaster-observation scenario overlay | Never infer ground truth or payload detections from the feed. |
| [NASA POWER](https://power.larc.nasa.gov/) | Solar and meteorological climatology/analysis products | Public | Scenario parameterization and ground-site studies | Better suited to scenario/replay than spacecraft-real-time telemetry. |
| [USGS National Map APIs](https://apps.nationalmap.gov/services/) | Terrain and base-map services | Public | Ground-station, coverage, and visual context | Apply normal attribution and caching practices. |
| [Open-Meteo](https://open-meteo.com/en/docs) | Weather forecast/archive API | Public / terms | Ground-station weather simulation | Third-party convenience feed; do not make it an authority for mission operations. |
| [Meteostat](https://dev.meteostat.net/) | Historical weather/station data | Public / terms | Ground-station weather replay | Validate station completeness and timestamp handling. |

### 3.5 Amateur/academic ground observation and receiver networks

| Source | Data useful to PCSS II | Access class | Recommended use | Important constraints |
| --- | --- | --- | --- | --- |
| [SatNOGS Network](https://network.satnogs.org/) | Community ground-station observation context | Public / terms | Educational pass and observation visualizations | Community observations vary in coverage and quality; do not treat as spacecraft telemetry. |
| [SatNOGS DB](https://db.satnogs.org/) | Transmitter, satellite, and observation metadata | Public / terms | RF catalogue context | Preserve contributor attribution and data license. |
| [AMSAT](https://www.amsat.org/) | Amateur-satellite mission and frequency resources | Public | Educational communications context | Verify per-mission status and licensing before automated use. |
| [HamSCI](https://hamsci.org/) | Citizen-science radio and ionospheric research resources | Public / research | Ionospheric/reception experiments | Treat it as research context rather than operational data. |

### 3.6 Mission-owned data: the only source of real vehicle telemetry

PCSS II can support an actual mission only when the mission owner intentionally connects a controlled gateway. Recommended transports are:

- HTTPS pull from a mission-control API using short-lived, server-to-server credentials.
- A verified webhook receiver for downlink events and decoded telemetry packets.
- MQTT over TLS with a dedicated service that validates topics, client identity, payload schema, and rate limits.
- A WebSocket or Server-Sent Events bridge from an internal telemetry service to the PCSS II client after authorization.
- Immutable archived files—CSV, JSONL, CCSDS packets, or mission-defined binary packets—for replay.

Do not accept a user-supplied external URL in the browser. It invites server-side request forgery, leaking credentials, unpredictable CORS failures, and unbounded provider usage. Connections should be predefined adapters with an allow-listed upstream host and a published schema.

## 4. Reference architecture for Vercel

The Vite client remains a static interactive application. All credentials, provider-specific protocol parsing, caching, and upstream calls live behind server-side endpoints.

```text
                         ┌─────────────────────────────┐
                         │        PCSS II browser       │
                         │ settings · views · simulator │
                         └──────────────┬──────────────┘
                                        │ normalized, safe JSON
                         ┌──────────────▼──────────────┐
                         │ Vercel API / feed gateway    │
                         │ auth · allow lists · cache   │
                         │ validation · rate limits     │
                         └───────┬──────────────┬───────┘
                                 │              │
                  ┌──────────────▼───┐    ┌─────▼──────────────────┐
                  │ Public providers │    │ Credentialed providers  │
                  │ NOAA · CelesTrak │    │ Space-Track · IGS ·     │
                  │ IERS · imagery   │    │ Earthdata · mission API │
                  └──────────────────┘    └────────────────────────┘
```

### 4.1 Adapter contract

Each provider adapter should return one normalized envelope. The payload itself remains provider-specific, but the metadata is mandatory.

```ts
type DataProvenance =
  | 'SIMULATED'
  | 'LIVE_CONTEXT'
  | 'REPLAY'
  | 'MISSION_TELEMETRY';

type FeedEnvelope<T> = {
  providerId: string;
  feedId: string;
  provenance: DataProvenance;
  observedAt: string;       // when the source says the value/event occurred
  retrievedAt: string;      // when PCSS II obtained it
  expiresAt: string;        // after this, UI becomes STALE
  quality: 'NOMINAL' | 'SUSPECT' | 'DEGRADED' | 'UNAVAILABLE';
  units?: Record<string, string>;
  sourceUrl: string;
  licenseOrTermsUrl?: string;
  rawChecksum?: string;     // for reproducible replay and audit
  payload: T;
};
```

The adapter interface should include a source-specific validator, timeout, bounded retry policy, cache policy, and a `toScenarioInput` conversion only where scientifically justified.

### 4.2 API route pattern

Use narrowly scoped endpoints, for example:

```text
/api/feeds/space-weather          public NOAA-derived environment envelope
/api/feeds/orbit/:catalogId       cached OMM / propagation input for an allow-listed ID
/api/feeds/eop                    cached IERS EOP envelope
/api/feeds/mission/status         authenticated mission-connection status only
/api/feeds/mission/telemetry      authorized, normalized mission packet stream
```

Rules for every route:

1. Parse and validate all request parameters; catalog IDs, group names, and time ranges must be bounded.
2. Allow only known upstream hosts and fixed provider query shapes.
3. Set a provider-appropriate cache TTL and return the source timestamp separately from the response timestamp.
4. Timeout upstream calls quickly, use exponential backoff only on the server, and serve the last known good value as `STALE` when safe.
5. Never return an upstream credential, authorization header, raw token, or internal endpoint to the browser.
6. Record anonymized health metrics: request count, cache hit, latency, response status, freshness, and parser version.
7. Add per-user/session rate limiting for costly queries and a global circuit breaker for an unhealthy provider.

### 4.3 Secrets and environments

Store credentials only in Vercel environment variables or a purpose-built secret manager. Examples:

```text
SPACE_TRACK_USERNAME
SPACE_TRACK_PASSWORD_OR_TOKEN
EARTHDATA_TOKEN
IGS_NTRIP_USERNAME
IGS_NTRIP_PASSWORD
MISSION_TELEMETRY_API_URL
MISSION_TELEMETRY_CLIENT_ID
MISSION_TELEMETRY_CLIENT_SECRET
MISSION_WEBHOOK_SIGNING_SECRET
```

These names are examples, not a required environment schema. Do not place their values in `.env.example`, source control, browser-visible `VITE_*` variables, logs, screenshots, or support tickets. Rotate a secret after any suspected exposure.

## 5. Settings design: low cognitive load, high trust

Add a top-level **Data Sources** settings panel rather than scattering connection controls through Orbit, Thermal, GNSS-RO, and Comms.

Each provider card should contain only:

- A clear name and one-sentence purpose.
- A toggle: **Use simulated data** / **Use live context** / **Use replay**.
- Connection state: **Public**, **Not connected**, **Connected**, **Stale**, or **Unavailable**.
- “Updated … ago,” the source's observation time, and the next permitted refresh.
- A plain-language description of what the feed affects.
- A disclosure for details: source URL, terms, units, model mapping, quality flags, and reset action.

Suggested default configuration:

| Feature | Default | Why |
| --- | --- | --- |
| Orbit | Scenario state | Keeps the experience deterministic and fast. |
| Space weather | Simulated | Avoids surprising source changes in a first-run experience. |
| Public live context | Off until enabled | Makes consent and network use explicit. |
| Authenticated providers | Disconnected | Requires server-side configuration by a project administrator. |
| Mission telemetry | Unavailable | Prevents an educational profile from looking connected to a real spacecraft. |
| Replay | Available with bundled examples | Enables reproducible demonstrations without credentials. |

The dashboard should include one compact source strip, for example: `Orbit: Scenario · Space weather: NOAA, 12 min old · Telemetry: Not connected`. Selecting it opens the Data Sources panel.

## 6. How a feed may affect the model

| Feed | Safe first use | Advanced use | Never claim |
| --- | --- | --- | --- |
| GP/OMM elements | Initialize visible orbit and pass prediction | Seed an orbit estimator with uncertainty | Exact real-time vehicle position or command-ready ephemeris |
| Kp/F10.7/solar wind | Environment card and drag scenario parameter | Drive an atmospheric-density ensemble | Measured drag coefficient or spacecraft health |
| IERS EOP | Frame conversion input | High-accuracy coordinate transformation | Spacecraft observation |
| IGS RTS | GNSS subsystem fidelity exercise | PPP/SSR measurement simulation | PCSS-II receiver solution unless actual receiver data exists |
| GNSS-RO science data | Historical profile replay | Compare retrieval algorithms | Live payload data |
| Ground-network reception | Community observation overlay | RF coverage/reception statistics | Authoritative telemetry |
| Mission gateway | Status and packet display | State estimator and fault detection | Command or safety authority without an approved mission system |

## 7. Phased delivery plan

### Phase 0 — Make assumptions visible

- Add a global provenance model and `SIMULATED` badges to the current hard-coded space-weather and pass-prediction outputs.
- Document current simplified inputs: fixed Kp/F10.7, exponential density, generated station passes, and preset catalogue values.
- Add a source-health store with `updatedAt`, `expiresAt`, `quality`, and error reason.
- Build snapshot tests for deterministic simulator behavior before live data is introduced.

### Phase 1 — Public, low-risk context feeds

- Add a NOAA SWPC adapter for Kp, F10.7, solar-wind context, and an explicit stale fallback.
- Add a CelesTrak OMM/JSON adapter for a user-selected catalog identifier, with server cache and an OMM-first parser.
- Add IERS EOP ingestion for frame/time accuracy, with a versioned local fallback.
- Implement the Data Sources settings page and the dashboard source strip.
- Create an exportable “scenario manifest” that captures all model settings and provider versions/timestamps.

### Phase 2 — Reproducible science replay

- Add imported, immutable replay bundles with a manifest, raw-file checksum, source URL, retrieval time, license/terms, and parser version.
- Support GNSS-RO profile playback from a curated Earthdata/COSMIC dataset.
- Add NOAA, OMNIWeb, and geomagnetic-index replay datasets for environmental events.
- Add comparison plots: simulated prediction, observed/replayed value, residual, and uncertainty band.

### Phase 3 — Authenticated providers

- Implement server-only adapters for Space-Track, Earthdata-protected products, IGS NTRIP, and any licensed source selected by the project.
- Add provider-specific terms acceptance in admin documentation, not in a client-side checkbox that falsely conveys permission.
- Add audit events for connection configuration changes and a secret-rotation runbook.
- Load-test caching and failure behavior before enabling the provider for a deployed site.

### Phase 4 — Mission-controlled gateway

- Define an authenticated mission telemetry schema, unit registry, packet sequence semantics, time synchronization policy, and quality flags.
- Validate webhook signatures or mTLS/OAuth client credentials at the gateway.
- Store raw packets separately from derived state estimates.
- Add latency, dropped-packet, out-of-order, duplicate, and clock-skew handling.
- Require an explicit connection profile and a conspicuous `MISSION TELEMETRY` state before any mission data is displayed.

### Phase 5 — Verification and operational discipline

- Compare SGP4 results against published verification vectors and keep regression fixtures pinned.
- Establish test cases for frame transforms, leap seconds, EOP updates, parsing, cache expiry, stale indicators, and provider failure.
- Run numerical-model validation against documented reference cases; publish residuals and assumptions.
- Review licenses, rate limits, retention, data handling, and attribution before every new provider is enabled.

## 8. Reliability, security, and privacy controls

| Risk | Required control |
| --- | --- |
| Provider outage or slow response | Short server timeout, cache, circuit breaker, stale state, deterministic fallback. |
| Excess API polling | Provider-specific cache policy, request coalescing, rate limiting, and background refresh. |
| Credential exposure | Server-only secrets, no browser tokens, redacted logs, scoped/rotated credentials. |
| SSRF or arbitrary upstream calls | Fixed adapter registry, host allow list, strict parameter validation; no “fetch this URL” UI. |
| Bad or malformed source payload | Runtime schema validation, units validation, range checks, quarantined raw record, visible quality state. |
| Misleading status | Provenance badges, observation vs. retrieval time, explicit `STALE` and `UNAVAILABLE` states. |
| Non-reproducible analysis | Replay manifest, source URL, checksum, parser/model version, and scenario export. |
| Safety overclaim | Clear scope statement; no command interface, maneuver recommendation, or operational conjunction decision. |

## 9. Suggested acceptance criteria

A live-context release is ready when all of the following are true:

1. A user can tell in under five seconds whether a displayed value is simulated, live context, replay, or mission telemetry.
2. Disabling all sources makes the simulator deterministic and fully usable offline after initial load.
3. Every external result has provider identity, source time, retrieval time, expiry, quality, and a source link.
4. A failed provider produces a graceful stale/fallback state, not a blank dashboard or an uncaught error.
5. No credentials, private endpoint URLs, or unbounded request controls reach the client bundle.
6. Public data is cached according to provider policy, with no client-side polling storm.
7. A replay can be reproduced from its manifest and checksum without contacting the original provider.
8. Source terms, attribution, and use limits are recorded alongside each enabled integration.

## 10. Immediate recommendation for PCSS II

Start with **NOAA SWPC**, **CelesTrak OMM/JSON**, and **IERS EOP** as a small, defensible public-data foundation. They directly improve environmental context, orbit initialization, and frame/time handling while requiring no user credential in the browser.

At the same time, refactor the current generated `useSpaceWeatherQuery` and pass-prediction outputs into source-aware adapters. The existing simulated values should remain available as the default fallback. Once provenance, caching, failure behavior, and replay manifests exist, add Space-Track, Earthdata/RO datasets, IGS RTS, and finally a mission-owned telemetry gateway.

## 11. Source review checklist

Before enabling any source, record:

- Provider and exact product name/version.
- Official documentation and terms/usage-policy URL.
- Access type, required credentials, and owner of those credentials.
- Native format, units, coordinate frame, time scale, cadence, latency, and quality flags.
- Maximum query rate, cache TTL, retention/replay rights, and attribution text.
- Mapping from source fields to the simulator, including assumptions and uncertainty.
- Safe fallback behavior and maximum acceptable staleness.
- Test fixture and a contact/runbook for provider incidents.

This checklist turns a collection of APIs into an auditable engineering capability rather than a fragile collection of widgets.
