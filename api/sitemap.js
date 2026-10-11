const publicOrigin = (request) => {
  const host = String(request.headers['x-forwarded-host'] ?? request.headers.host ?? '').split(',')[0].trim();
  const protocol = String(request.headers['x-forwarded-proto'] ?? 'https').split(',')[0].trim() === 'http' ? 'http' : 'https';
  return host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host) ? `${protocol}://${host}` : null;
};

const escapeXml = (value) => value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]);

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).send('Method not allowed');
  const origin = publicOrigin(request);
  if (!origin) return response.status(400).send('A public host is required to generate the sitemap.');

  const location = escapeXml(`${origin}/`);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${location}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`;
  response.setHeader('Content-Type', 'application/xml; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  response.status(200).send(body);
}
