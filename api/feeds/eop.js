import { fetchWithTimeout, isGet, sendJson, success, unavailable } from '../_feed.js';

const SOURCE_URL = 'https://datacenter.iers.org/data/latestVersion/finals2000A.all';

export default async function handler(request, response) {
  if (!isGet(request, response)) return;
  try {
    const upstream = await fetchWithTimeout(SOURCE_URL);
    if (!upstream.ok) throw new Error(`IERS returned ${upstream.status}`);
    const text = await upstream.text();
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const latest = lines.at(-1);
    if (!latest) throw new Error('No IERS EOP record returned');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    sendJson(response, 200, success('iers', 'eop-finals2000a', new Date().toISOString(), expiresAt, SOURCE_URL, { format: 'IERS finals2000A', latestRecord: latest.trim() }), 'public, s-maxage=21600, stale-while-revalidate=86400');
  } catch (error) {
    sendJson(response, 200, unavailable('iers', 'eop-finals2000a', 'Earth-orientation context is temporarily unavailable.', SOURCE_URL), 'public, s-maxage=300, stale-while-revalidate=600');
  }
}
