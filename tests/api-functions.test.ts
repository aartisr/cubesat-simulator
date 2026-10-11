import assert from 'node:assert/strict';
import test from 'node:test';
import eopHandler from '../api/feeds/eop.js';
import orbitHandler from '../api/feeds/orbit.js';
import spaceWeatherHandler from '../api/feeds/space-weather.js';
import missionStatusHandler from '../api/mission/status.js';
import missionTelemetryHandler from '../api/mission/telemetry.js';
import { newestDatedItem } from '../api/_feed.js';

class MockResponse {
  headers = new Map<string, string>();
  statusCode = 0;
  body: unknown;
  setHeader(name: string, value: string) { this.headers.set(name, value); }
  status(statusCode: number) { this.statusCode = statusCode; return this; }
  json(body: unknown) { this.body = body; return this; }
}

const asJsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body });

test('newestDatedItem chooses the latest usable record and ignores malformed input', () => {
  assert.equal(newestDatedItem('not-an-array', ['value']), null);
  const result = newestDatedItem([
    { time_tag: '2026-10-01T00:00:00Z', value: 1 },
    { time_tag: '2026-10-02T00:00:00Z', value: 2 },
  ], ['value']);
  assert.equal(result.value, 2);
});

test('all public feed handlers reject non-GET requests consistently', async () => {
  for (const handler of [spaceWeatherHandler, orbitHandler, eopHandler, missionStatusHandler]) {
    const response = new MockResponse();
    await handler({ method: 'POST', query: {} }, response);
    assert.equal(response.statusCode, 405);
    assert.deepEqual(response.body, { error: 'Method not allowed' });
  }
});

test('space-weather adapter normalizes latest NOAA records and sets a cache policy', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => url.includes('planetary')
    ? asJsonResponse([{ time_tag: '2026-10-10T00:00:00Z', kp_index: 1.33 }, { time_tag: '2026-10-10T01:00:00Z', kp_index: 4.67 }])
    : asJsonResponse([{ time_tag: '2026-10-10T01:00:00Z', flux: 152.5 }])) as unknown as typeof fetch;
  try {
    const response = new MockResponse();
    await spaceWeatherHandler({ method: 'GET', query: {} }, response);
    const body = response.body as any;
    assert.equal(response.statusCode, 200);
    assert.equal(body.quality, 'NOMINAL');
    assert.equal(body.payload.kpIndex, 4.67);
    assert.equal(body.payload.f107Flux, 152.5);
    assert.match(response.headers.get('Cache-Control') ?? '', /s-maxage=300/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('space-weather adapter returns a safe unavailable envelope when upstream fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
  try {
    const response = new MockResponse();
    await spaceWeatherHandler({ method: 'GET', query: {} }, response);
    const body = response.body as any;
    assert.equal(response.statusCode, 200);
    assert.equal(body.quality, 'UNAVAILABLE');
    assert.equal(body.payload, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('orbit adapter validates catalog IDs before making an upstream request', async () => {
  const originalFetch = globalThis.fetch;
  let wasCalled = false;
  globalThis.fetch = (async () => { wasCalled = true; return asJsonResponse([]); }) as unknown as typeof fetch;
  try {
    const response = new MockResponse();
    await orbitHandler({ method: 'GET', query: { id: 'not-a-catalog-id' } }, response);
    assert.equal(response.statusCode, 400);
    assert.equal(wasCalled, false);
    assert.match((response.body as { error: string }).error, /numeric catalog id/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('orbit and EOP adapters normalize valid upstream data and use stable cache policies', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    if (url.includes('celestrak')) {
      return asJsonResponse([{ NORAD_CAT_ID: 25544, EPOCH: '2026-10-10T00:00:00.000Z' }]);
    }
    return { ok: true, text: async () => 'header\nlatest EOP record\n' };
  }) as unknown as typeof fetch;
  try {
    const orbitResponse = new MockResponse();
    await orbitHandler({ method: 'GET', query: { id: '25544' } }, orbitResponse);
    assert.equal(orbitResponse.statusCode, 200);
    assert.equal((orbitResponse.body as any).payload.catalogId, '25544');
    assert.equal((orbitResponse.body as any).payload.record.NORAD_CAT_ID, 25544);
    assert.match(orbitResponse.headers.get('Cache-Control') ?? '', /s-maxage=3600/);

    const eopResponse = new MockResponse();
    await eopHandler({ method: 'GET', query: {} }, eopResponse);
    assert.equal(eopResponse.statusCode, 200);
    assert.equal((eopResponse.body as any).payload.latestRecord, 'latest EOP record');
    assert.match(eopResponse.headers.get('Cache-Control') ?? '', /s-maxage=21600/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('mission status stays explicitly simulated until both gateway variables are configured', () => {
  const originalUrl = process.env.MISSION_TELEMETRY_API_URL;
  const originalToken = process.env.MISSION_TELEMETRY_BEARER_TOKEN;
  delete process.env.MISSION_TELEMETRY_API_URL;
  delete process.env.MISSION_TELEMETRY_BEARER_TOKEN;
  try {
    const response = new MockResponse();
    missionStatusHandler({ method: 'GET', query: {} }, response);
    assert.equal((response.body as any).quality, 'UNAVAILABLE');
    assert.match((response.body as any).message, /simulated mode/);
  } finally {
    if (originalUrl === undefined) delete process.env.MISSION_TELEMETRY_API_URL; else process.env.MISSION_TELEMETRY_API_URL = originalUrl;
    if (originalToken === undefined) delete process.env.MISSION_TELEMETRY_BEARER_TOKEN; else process.env.MISSION_TELEMETRY_BEARER_TOKEN = originalToken;
  }
});

test('mission telemetry rejects malformed gateway data without leaking an upstream error', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.MISSION_TELEMETRY_API_URL;
  const originalToken = process.env.MISSION_TELEMETRY_BEARER_TOKEN;
  process.env.MISSION_TELEMETRY_API_URL = 'https://gateway.example.test/telemetry';
  process.env.MISSION_TELEMETRY_BEARER_TOKEN = 'test-token';
  globalThis.fetch = (async () => asJsonResponse({ observedAt: 'bad', quality: 'NOMINAL', data: {} })) as unknown as typeof fetch;
  try {
    const response = new MockResponse();
    await missionTelemetryHandler({ method: 'GET', query: {} }, response);
    const body = response.body as any;
    assert.equal(body.quality, 'UNAVAILABLE');
    assert.equal(body.message, 'The configured mission gateway did not return usable telemetry.');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.MISSION_TELEMETRY_API_URL; else process.env.MISSION_TELEMETRY_API_URL = originalUrl;
    if (originalToken === undefined) delete process.env.MISSION_TELEMETRY_BEARER_TOKEN; else process.env.MISSION_TELEMETRY_BEARER_TOKEN = originalToken;
  }
});

test('mission telemetry accepts a valid read-only gateway envelope', async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.MISSION_TELEMETRY_API_URL;
  const originalToken = process.env.MISSION_TELEMETRY_BEARER_TOKEN;
  process.env.MISSION_TELEMETRY_API_URL = 'https://gateway.example.test/telemetry';
  process.env.MISSION_TELEMETRY_BEARER_TOKEN = 'test-token';
  globalThis.fetch = (async () => asJsonResponse({
    observedAt: '2026-10-10T00:00:00.000Z', quality: 'NOMINAL', sequence: 42, data: { batterySocPercent: 81.2 },
  })) as unknown as typeof fetch;
  try {
    const response = new MockResponse();
    await missionTelemetryHandler({ method: 'GET', query: {} }, response);
    const body = response.body as any;
    assert.equal(body.provenance, 'MISSION_TELEMETRY');
    assert.equal(body.payload.sequence, 42);
    assert.equal(body.payload.data.batterySocPercent, 81.2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.MISSION_TELEMETRY_API_URL; else process.env.MISSION_TELEMETRY_API_URL = originalUrl;
    if (originalToken === undefined) delete process.env.MISSION_TELEMETRY_BEARER_TOKEN; else process.env.MISSION_TELEMETRY_BEARER_TOKEN = originalToken;
  }
});
