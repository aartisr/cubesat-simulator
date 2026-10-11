import { fetchWithTimeout, isGet, sendJson, success, unavailable } from '../_feed.js';

const CATALOG_ID = /^\d{1,9}$/;

export default async function handler(request, response) {
  if (!isGet(request, response)) return;
  const catalogId = String(request.query?.id ?? '');
  if (!CATALOG_ID.test(catalogId)) {
    sendJson(response, 400, { error: 'A numeric catalog id of up to nine digits is required.' });
    return;
  }

  const sourceUrl = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${catalogId}&FORMAT=JSON`;
  try {
    const upstream = await fetchWithTimeout(sourceUrl);
    if (!upstream.ok) throw new Error(`CelesTrak returned ${upstream.status}`);
    const records = await upstream.json();
    const record = Array.isArray(records) ? records[0] : null;
    if (!record) throw new Error('No GP record returned for catalog id');
    const observedAt = record.EPOCH ?? record.epoch ?? new Date().toISOString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    sendJson(response, 200, success('celestrak', 'gp-omm', observedAt, expiresAt, sourceUrl, { catalogId, record }), 'public, s-maxage=3600, stale-while-revalidate=3600');
  } catch (error) {
    sendJson(response, 200, unavailable('celestrak', 'gp-omm', 'Live orbit context is temporarily unavailable for this catalog id.', sourceUrl), 'public, s-maxage=60, stale-while-revalidate=120');
  }
}
