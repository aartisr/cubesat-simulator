import { isGet, sendJson, unavailable } from '../_feed.js';

export default function handler(request, response) {
  if (!isGet(request, response)) return;
  const sourceUrl = 'Mission gateway configuration';
  if (!process.env.MISSION_TELEMETRY_API_URL || !process.env.MISSION_TELEMETRY_BEARER_TOKEN) {
    sendJson(response, 200, unavailable('mission-gateway', 'connection-status', 'No project-controlled telemetry gateway is configured. Astroneer remains in simulated mode.', sourceUrl), 'private, no-store');
    return;
  }
  sendJson(response, 200, {
    providerId: 'mission-gateway', feedId: 'connection-status', provenance: 'MISSION_TELEMETRY', observedAt: null,
    retrievedAt: new Date().toISOString(), expiresAt: null, quality: 'NOMINAL', sourceUrl,
    message: 'Mission gateway configuration is present. Telemetry is retrieved through the server-side polling adapter.', payload: { configured: true },
  }, 'private, no-store');
}
