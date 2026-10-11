# Astroneer CubeSat Simulator

> A browser-based digital twin for exploring the coupled dynamics of a CubeSat mission—from orbit and attitude to power, thermal behavior, communications, and conjunction safety.

Astroneer is an interactive simulation environment for 1U, 3U, and 6U small-satellite concepts. Its default Astroneer virtual twin is a compact 1U technology demonstrator; switching spacecraft updates the modeled body envelope, mass, drag reference area, solar-array geometry, and power capacity together. Adjust a condition, advance time, and observe the knock-on effects across the vehicle.

**Start here:** use this README for setup and orientation, then consult the [technical reference](DOCUMENTATION.md) for the full mathematical and operational reference.

## Why Astroneer

Spacecraft subsystems do not operate in isolation. A change in attitude changes solar incidence; solar incidence changes battery behavior; power dissipation changes thermal state; and orbit geometry changes both ground contact and conjunction context. Astroneer makes those dependencies visible in one place.

| Explore | Observe | Act |
| --- | --- | --- |
| 3D orbit, ground track, eclipse geometry, and spacecraft attitude | Live mission pulse, health, telemetry, history, and event activity | Adjust simulation speed, select a vehicle, change subsystem settings, and examine safety conditions |

## What you can model

- **Orbit:** Keplerian propagation, WGS-84 geodetics, J2 perturbation, nodal regression, ground tracks, and atmospheric-drag estimates.
- **ADCS & propulsion:** Quaternion attitude representation, reaction wheels, magnetic detumbling, pointing modes, RCS controls, and maneuver accounting.
- **Electrical power:** Solar geometry, eclipse transitions, panel incidence, battery state of charge, bus loads, and low-power behavior.
- **Thermal control:** Coupled thermal nodes, radiative exchange, conductive paths, louvers, heaters, straps, and operating scenarios.
- **GNSS radio occultation:** Sounding geometry, refractivity profiles, inversion concepts, constellation selection, and edge-compute modes.
- **Communications:** Ground-station visibility, link budget quantities, Doppler effects, downlink state, and mission data flow.
- **Conjunction assessment:** Relative geometry, B-plane risk context, close-approach indicators, and collision-avoidance workflow.

## First five minutes

1. Run the app and begin on **Overview**.
2. Read the **Mission pulse**: it describes the current state and recommends the next useful action.
3. Use the 3D scene to inspect the orbit. Camera presets and visual layers are available directly in the scene.
4. Open a workspace—**Orbit**, **Attitude**, **Power**, **Thermal**, **Climate**, **Comms**, or **Safety**—when you want to study a specific subsystem.
5. Use the simulation controls in the header to pause, resume, reset, or change time warp. Open **Telemetry** for the raw mission stream.

### Inspect charts without losing context

Time-series and profile charts retain their original samples while you pan or zoom with the chart navigator. Use the expand control to enter focused full-screen inspection, then press **Escape** or the restore control to return. This behavior is shared by the interactive data charts so a close look never changes simulation data or chart precision.

The default vehicle, **Astroneer**, is a virtual twin. Named alternate presets are educational simulation profiles; their data is not a live operational feed.

## Architecture

```text
                   ┌────────────────────┐
                   │  Simulation clock  │
                   └─────────┬──────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
   Orbit & environment     ADCS             EPS / thermal
   J2 · drag · eclipse  attitude · RCS   solar · battery · nodes
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
                 Telemetry history & UI state
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
       Ground track      GNSS-RO          Comms & safety
```

The React interface reads a shared Zustand simulation store. The physics loop advances while the simulation is running, and TanStack Query provides derived, time-aware mission data for the UI.

## Documentation map

| Resource | Use it for |
| --- | --- |
| [Technical monograph](DOCUMENTATION.md) | Equations, assumptions, operations procedures, nomenclature, and references |
| [Real-time data strategy](docs/REAL_TIME_DATA_STRATEGY.md) | Hybrid-digital-twin architecture, source catalogue, secure feed integration, and implementation roadmap |
| [Real-time data status](docs/REAL_TIME_DATA_STATUS.md) | Implemented stages, deployment checklist, optional environment variables, and intentional limits |
| [Mission gateway contract](docs/MISSION_GATEWAY_CONTRACT.md) | Read-only HTTPS telemetry schema, gateway responsibilities, and credential-rotation procedure |
| [Architecture guide](docs/ARCHITECTURE.md) | Module boundaries, reusable primitives, extension recipe, and resilience rules |
| [In-app documentation module](src/modules/docs/DocumentationModule.tsx) | Searchable, interactive explanations, calculators, checklists, and live telemetry cross-references |
| [Orbit mathematics](src/core/math/sgp4.ts) | Propagation and orbital-element implementation |
| [Thermal mathematics](src/core/math/thermal.ts) | Thermal-network model and control behavior |
| [Simulator state](src/core/store/useSimulatorStore.ts) | The central state model and time-step integration |

## Run locally

**Prerequisite:** Node.js 22.x (also declared in [`.nvmrc`](.nvmrc) and `package.json`).

```bash
npm ci
npm run dev
```

Then open `http://localhost:3000`.

Useful commands:

```bash
npm run lint    # Type-check the application
npm run build   # Create a production build in dist/
npm run preview # Serve the production build locally
npm test        # Run deterministic physics, data, and API regression tests
npm run test:all # Run type-check, tests, and production build
```

## Deploy to Vercel

This is a Vite single-page application with optional Vercel Functions for data feeds. [Vercel configuration](vercel.json) installs from the lockfile, runs `npm run build`, publishes `dist`, and keeps `/api/*` server-side.

1. Import the repository into Vercel.
2. Use Node.js 22.x.
3. Deploy—no environment variables are required for simulation-only use. Public context feeds work without credentials; authenticated providers and a mission gateway are opt-in and use only server-side environment variables. See the [data status](docs/REAL_TIME_DATA_STATUS.md).

## Scope and responsible use

Astroneer is an educational and engineering-exploration simulator. It is not a source of flight-qualified ephemerides, collision screening, command authority, or operational spacecraft telemetry. Validate any mission-critical analysis with authoritative data, approved models, and qualified review processes.

## License and contribution

No license file is currently included. Before distributing, reusing, or accepting external contributions, define the intended license and contribution policy.
