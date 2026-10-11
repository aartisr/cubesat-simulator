const json = (response, status, body, cacheControl = 'private, no-store') => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', cacheControl);
  response.status(status).json(body);
};

export const unavailable = (providerId, feedId, message, sourceUrl) => ({
  providerId,
  feedId,
  provenance: 'LIVE_CONTEXT',
  observedAt: null,
  retrievedAt: new Date().toISOString(),
  expiresAt: null,
  quality: 'UNAVAILABLE',
  sourceUrl,
  message,
  payload: null,
});

export const success = (providerId, feedId, observedAt, expiresAt, sourceUrl, payload, units = {}) => ({
  providerId,
  feedId,
  provenance: 'LIVE_CONTEXT',
  observedAt,
  retrievedAt: new Date().toISOString(),
  expiresAt,
  quality: 'NOMINAL',
  sourceUrl,
  units,
  payload,
});

export const sendJson = json;

/** Bounded upstream fetch used by every provider adapter. */
export const fetchWithTimeout = async (url, options = {}, timeoutMs = 8_000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const isGet = (request, response) => {
  if (request.method === 'GET') return true;
  json(response, 405, { error: 'Method not allowed' });
  return false;
};

export const newestDatedItem = (items, keys) => {
  if (!Array.isArray(items)) return null;
  return [...items]
    .filter((item) => item && keys.some((key) => item[key] !== undefined && item[key] !== null))
    .sort((a, b) => new Date(b.time_tag ?? b.time ?? b.observed_at ?? 0).getTime() - new Date(a.time_tag ?? a.time ?? a.observed_at ?? 0).getTime())[0] ?? null;
};
