import { isGet, sendJson, unavailable } from '../_feed.js';

export default function handler(request, response) {
  if (!isGet(request, response)) return;
  const configured = Boolean(process.env.SPACE_TRACK_USERNAME && process.env.SPACE_TRACK_PASSWORD);
  const sourceUrl = 'https://www.space-track.org/documentation';
  if (!configured) {
    sendJson(response, 200, unavailable('space-track', 'connection-status', 'Not configured. Add server-only SPACE_TRACK_USERNAME and SPACE_TRACK_PASSWORD in Vercel before enabling this provider.', sourceUrl), 'private, no-store');
    return;
  }
  sendJson(response, 200, {
    providerId: 'space-track', feedId: 'connection-status', provenance: 'LIVE_CONTEXT', observedAt: null,
    retrievedAt: new Date().toISOString(), expiresAt: null, quality: 'NOMINAL', sourceUrl,
    message: 'Configured server-side. A provider-specific query adapter must be approved before data retrieval is enabled.', payload: { configured: true },
  }, 'private, no-store');
}
