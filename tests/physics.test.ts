import assert from 'node:assert/strict';
import test from 'node:test';
import { CUBESAT_PRESETS } from '../src/core/data/tleCatalog';
import { HarrisPriesterPhysics } from '../src/core/math/harrisPriester';
import { OrbitalMechanics } from '../src/core/math/sgp4';
import { EARTH_RADIUS_KM, SolarPhysics } from '../src/core/math/solar';

const closeTo = (actual: number, expected: number, tolerance: number, message?: string) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, message ?? `${actual} was not within ${tolerance} of ${expected}`);
};

test('Kepler solver satisfies the governing equation across representative eccentricities', () => {
  for (const eccentricity of [0, 0.001, 0.1, 0.6]) {
    for (const meanAnomaly of [0, 0.2, Math.PI, 5.9]) {
      const eccentricAnomaly = OrbitalMechanics.solveKepler(meanAnomaly, eccentricity);
      const normalizedMean = ((meanAnomaly % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      closeTo(eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly), normalizedMean, 1e-10);
    }
  }
});

test('orbital propagation preserves physically valid element ranges and produces a finite state', () => {
  const initial = CUBESAT_PRESETS[0].initialElements;
  const result = OrbitalMechanics.propagate(initial, 3600, true);
  assert.ok(result.elements.semiMajorAxis > EARTH_RADIUS_KM);
  assert.ok(result.elements.eccentricity >= 0 && result.elements.eccentricity < 1);
  assert.ok(result.elements.raan >= 0 && result.elements.raan < 360);
  assert.ok(result.elements.meanAnomaly >= 0 && result.elements.meanAnomaly < 360);
  assert.ok(result.elements.periodMinutes > 0);
  for (const value of [...Object.values(result.positionECI), ...Object.values(result.velocityECI)]) assert.ok(Number.isFinite(value));
});

test('Harris-Priester density responds monotonically to solar flux for the same geometry', () => {
  const position = { x: 6878, y: 0, z: 0 };
  const sun = { x: 1, y: 0, z: 0 };
  const quiet = HarrisPriesterPhysics.calculateDensity(500, position, sun, 70);
  const active = HarrisPriesterPhysics.calculateDensity(500, position, sun, 250);
  assert.ok(quiet.densityKgM3 > 0);
  assert.ok(active.densityKgM3 > quiet.densityKgM3);
  assert.ok(active.diurnalFactor >= 0 && active.diurnalFactor <= 1);
});

test('solar geometry distinguishes a sun-facing spacecraft from Earth umbra', () => {
  const sun = { x: 1, y: 0, z: 0 };
  const sunward = SolarPhysics.calculateEclipse({ x: EARTH_RADIUS_KM + 500, y: 0, z: 0 }, sun);
  const nightside = SolarPhysics.calculateEclipse({ x: -(EARTH_RADIUS_KM + 500), y: 0, z: 0 }, sun);
  assert.equal(sunward.state, 'SUNLIGHT');
  assert.equal(nightside.state, 'UMBRA');
  closeTo(sunward.fraction, 1, 1e-12);
  closeTo(nightside.fraction, 0, 1e-12);
});
