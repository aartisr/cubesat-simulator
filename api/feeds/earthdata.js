import { isGet, sendJson, unavailable } from '../_feed.js';

export default function handler(request, response) {
  if (!isGet(request, response)) return;
  const sourceUrl = 'https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html';
  if (!process.env.EARTHDATA_TOKEN) {
    sendJson(response, 200, unavailable('nasa-earthdata', 'connection-status', 'Not configured. Add a server-only EARTHDATA_TOKEN in Vercel before enabling protected Earthdata products.', sourceUrl), 'private, no-store');
    return;
  }
  sendJson(response, 200, {
    providerId: 'nasa-earthdata', feedId: 'connection-status', provenance: 'LIVE_CONTEXT', observedAt: null,
    retrievedAt: new Date().toISOString(), expiresAt: null, quality: 'NOMINAL', sourceUrl,
    message: 'Configured server-side. Select a documented collection and approved replay/processing adapter before retrieval is enabled.', payload: { configured: true },
  }, 'private, no-store');
}
