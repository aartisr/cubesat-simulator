import { fetchWithTimeout, isGet, newestDatedItem, sendJson, success, unavailable } from '../_feed.js';

const Kp_URL = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
const F107_URL = 'https://services.swpc.noaa.gov/json/f107_cm_flux.json';

export default async function handler(request, response) {
  if (!isGet(request, response)) return;

  try {
    const [kpResult, fluxResult] = await Promise.all([fetchWithTimeout(Kp_URL), fetchWithTimeout(F107_URL)]);
    if (!kpResult.ok || !fluxResult.ok) throw new Error('NOAA SWPC did not return both products');

    const [kpItems, fluxItems] = await Promise.all([kpResult.json(), fluxResult.json()]);
    const kp = newestDatedItem(kpItems, ['kp_index', 'estimated_kp', 'planetary_kp']);
    const flux = newestDatedItem(fluxItems, ['flux', 'f107', 'observed_flux']);
    const kpValue = Number(kp?.kp_index ?? kp?.estimated_kp ?? kp?.planetary_kp);
    const fluxValue = Number(flux?.flux ?? flux?.f107 ?? flux?.observed_flux);
    if (!Number.isFinite(kpValue) || !Number.isFinite(fluxValue)) throw new Error('NOAA SWPC response could not be normalized');

    const observedAt = [kp?.time_tag, flux?.time_tag].filter(Boolean).sort().at(-1) ?? new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    sendJson(response, 200, success(
      'noaa-swpc',
      'space-weather',
      observedAt,
      expiresAt,
      'https://services.swpc.noaa.gov/json/',
      { kpIndex: kpValue, f107Flux: fluxValue, kpRaw: kp, fluxRaw: flux },
      { kpIndex: 'index', f107Flux: 'sfu' },
    ), 'public, s-maxage=300, stale-while-revalidate=600');
  } catch (error) {
    sendJson(response, 200, unavailable('noaa-swpc', 'space-weather', 'Live space-weather context is temporarily unavailable.', 'https://services.swpc.noaa.gov/json/'), 'public, s-maxage=60, stale-while-revalidate=120');
  }
}
