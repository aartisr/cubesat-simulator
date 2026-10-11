import { fetchWithTimeout, isGet, sendJson, unavailable } from '../_feed.js';

const VALID_QUALITY = new Set(['NOMINAL', 'SUSPECT', 'DEGRADED', 'UNAVAILABLE']);

const validTimestamp = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

const normalizeTelemetry = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Gateway response must be a JSON object');
  const observedAt = value.observedAt ?? value.timestamp;
  if (!validTimestamp(observedAt)) throw new Error('Gateway response requires an ISO-8601 observedAt timestamp');
  if (!VALID_QUALITY.has(value.quality)) throw new Error('Gateway response has an invalid quality value');
  if (!value.data || typeof value.data !== 'object' || Array.isArray(value.data)) throw new Error('Gateway response requires an object data field');
  if (value.sequence !== undefined && (!Number.isInteger(value.sequence) || value.sequence < 0)) throw new Error('Gateway sequence must be a non-negative integer');
  return { ...value, observedAt };
};

export default async function handler(request, response) {
  if (!isGet(request, response)) return;
  const gatewayUrl = process.env.MISSION_TELEMETRY_API_URL;
  const token = process.env.MISSION_TELEMETRY_BEARER_TOKEN;
  const sourceUrl = 'Mission gateway configuration';
  if (!gatewayUrl || !token) {
    sendJson(response, 200, unavailable('mission-gateway', 'telemetry', 'No mission gateway is configured.', sourceUrl), 'private, no-store');
    return;
  }
  try {
    if (new URL(gatewayUrl).protocol !== 'https:') throw new Error('Mission gateway must use HTTPS');
  } catch {
    sendJson(response, 200, unavailable('mission-gateway', 'telemetry', 'The configured mission gateway URL is invalid or is not HTTPS.', sourceUrl), 'private, no-store');
    return;
  }
  try {
    const upstream = await fetchWithTimeout(gatewayUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }, 6_000);
    if (!upstream.ok) throw new Error(`Gateway returned ${upstream.status}`);
    const payload = normalizeTelemetry(await upstream.json());
    sendJson(response, 200, {
      providerId: 'mission-gateway', feedId: 'telemetry', provenance: 'MISSION_TELEMETRY',
      observedAt: payload.observedAt, retrievedAt: new Date().toISOString(),
      expiresAt: payload.expiresAt ?? new Date(Date.now() + 60_000).toISOString(), quality: payload.quality ?? 'NOMINAL',
      sourceUrl, message: 'Mission telemetry supplied by the configured gateway.', payload,
    }, 'private, no-store');
  } catch (error) {
    sendJson(response, 200, unavailable('mission-gateway', 'telemetry', 'The configured mission gateway did not return usable telemetry.', sourceUrl), 'private, no-store');
  }
}
