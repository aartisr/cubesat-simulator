import assert from 'node:assert/strict';
import test from 'node:test';
import { checksumText, isSpaceWeatherPayload, validateReplayBundle } from '../src/services/dataSources';

test('replay validation accepts a complete manifest and rejects incomplete or invalid timestamps', () => {
  const valid = validateReplayBundle({
    schemaVersion: 1,
    name: 'Quiet-space-weather replay',
    observedAt: '2026-10-10T00:00:00.000Z',
    sourceUrl: 'https://example.test/replay.json',
    payload: { spaceWeather: { kpIndex: 2, f107Flux: 115 } },
  });
  assert.equal(valid.name, 'Quiet-space-weather replay');
  assert.throws(() => validateReplayBundle({ schemaVersion: 1, name: 'bad', observedAt: 'not-a-date', sourceUrl: 'https://example.test', payload: {} }));
  assert.throws(() => validateReplayBundle({ schemaVersion: 1, name: 'missing payload', observedAt: '2026-10-10T00:00:00.000Z', sourceUrl: 'https://example.test' }));
});

test('space-weather shape guard accepts only complete finite numeric values', () => {
  assert.equal(isSpaceWeatherPayload({ kpIndex: 3.33, f107Flux: 140 }), true);
  assert.equal(isSpaceWeatherPayload({ kpIndex: 3.33 }), false);
  assert.equal(isSpaceWeatherPayload({ kpIndex: 'storm', f107Flux: 140 }), false);
  assert.equal(isSpaceWeatherPayload(null), false);
});

test('replay checksums are deterministic and content-sensitive', async () => {
  const first = await checksumText('{"value":1}');
  assert.equal(first, await checksumText('{"value":1}'));
  assert.notEqual(first, await checksumText('{"value":2}'));
  assert.match(first, /^sha256:[a-f0-9]{64}$/);
});
