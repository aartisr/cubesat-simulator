import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { CUBESAT_PRESETS } from '../src/core/data/tleCatalog';
import { useSimulatorStore } from '../src/core/store/useSimulatorStore';

beforeEach(() => {
  useSimulatorStore.getState().resetSimulation();
});

test('simulator controls keep shared drag and telemetry state synchronized', () => {
  const store = useSimulatorStore.getState();
  store.setDragAttitudePreset('DEORBIT_SAIL');
  store.setDragParameters({ cd: 2.4 });
  store.setEnableAtmosphericDrag(false);

  const state = useSimulatorStore.getState();
  assert.equal(state.dragParameters.attitudeMode, 'DEORBIT_SAIL');
  assert.equal(
    state.dragParameters.crossSectionAreaM2,
    Math.max(CUBESAT_PRESETS[0].geometry.broadsideDragAreaM2 * 2.5, 0.05)
  );
  assert.equal(state.dragParameters.cd, 2.4);
  assert.deepEqual(state.dragTelemetry.parameters, state.dragParameters);
  assert.equal(state.dragTelemetry.enabled, false);
});

test('satellite switching resets dependent state and handles an unknown preset safely', () => {
  const store = useSimulatorStore.getState();
  const target = CUBESAT_PRESETS.at(-1)!;
  store.tickPhysics(1);
  assert.equal(useSimulatorStore.getState().history.length, 1);

  store.switchSatellite(target.id);
  let state = useSimulatorStore.getState();
  assert.equal(state.selectedSatellite.id, target.id);
  assert.equal(state.history.length, 0);
  assert.equal(state.orbit.j2Enabled, state.enableJ2Perturbation);

  store.switchSatellite('not-a-preset');
  state = useSimulatorStore.getState();
  assert.equal(state.selectedSatellite.id, CUBESAT_PRESETS[0].id);
});

test('a physics tick emits a finite telemetry frame and exportable CSV', () => {
  const store = useSimulatorStore.getState();
  const before = useSimulatorStore.getState().simulatedTime;
  store.tickPhysics(2);

  const state = useSimulatorStore.getState();
  assert.ok(state.simulatedTime > before);
  assert.equal(state.history.length, 1);
  const frame = state.history[0];
  for (const value of Object.values(frame)) {
    if (typeof value === 'number') assert.ok(Number.isFinite(value));
  }

  const csv = state.exportTelemetryCSV();
  assert.match(csv, /^Time_s,Altitude_km,Velocity_km_s/);
  assert.equal(csv.trim().split('\n').length, 2);
});
