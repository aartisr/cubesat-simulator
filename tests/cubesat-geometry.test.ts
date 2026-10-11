import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CUBESAT_PRESETS } from '../src/core/data/tleCatalog';
import { SolarPhysics } from '../src/core/math/solar';

const pcss = CUBESAT_PRESETS.find((preset) => preset.id === 'pcss-ii')!;
const bioSentinel = CUBESAT_PRESETS.find((preset) => preset.id === 'biosentinel')!;

test('PCSS II retains a physically consistent 1U baseline', () => {
  assert.equal(pcss.formFactor, '1U');
  assert.deepEqual(pcss.geometry.bodyDimensionsM, { x: 0.1, y: 0.1135, z: 0.1 });
  assert.equal(pcss.geometry.nominalDragAreaM2, 0.01135);
  assert.equal(pcss.massKg, 1.25);
  assert.equal(pcss.solarCapacityW, 5);
});

test('larger CubeSat presets have materially larger geometry and solar envelopes', () => {
  assert.ok(bioSentinel.geometry.bodyDimensionsM.x > pcss.geometry.bodyDimensionsM.x);
  assert.ok(bioSentinel.geometry.bodyDimensionsM.y > pcss.geometry.bodyDimensionsM.y);
  assert.ok(bioSentinel.geometry.broadsideDragAreaM2 > pcss.geometry.broadsideDragAreaM2);
  assert.ok(
    bioSentinel.geometry.solarWing.spanM * bioSentinel.geometry.solarWing.chordM
      > pcss.geometry.solarWing.spanM * pcss.geometry.solarWing.chordM
  );
});

test('solar-face areas are derived from the selected bus dimensions', () => {
  const result = SolarPhysics.calculateSolarPanelIncidence(
    { x: 1, y: 0, z: 0 },
    { w: 1, x: 0, y: 0, z: 0 },
    true,
    1,
    25,
    pcss.solarCapacityW,
    pcss.geometry
  );

  assert.ok(Math.abs((result.panelFaces.find((face) => face.faceId === '+X')?.areaM2 ?? 0) - 0.01135) < 1e-12);
  assert.ok(Math.abs((result.panelFaces.find((face) => face.faceId === '+Y')?.areaM2 ?? 0) - 0.01) < 1e-12);
  assert.ok(Math.abs((result.panelFaces.find((face) => face.faceId === 'WING_LEFT')?.areaM2 ?? 0) - 0.01) < 1e-12);
});
