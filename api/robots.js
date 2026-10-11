const publicOrigin = (request) => {
  const host = String(request.headers['x-forwarded-host'] ?? request.headers.host ?? '').split(',')[0].trim();
  const protocol = String(request.headers['x-forwarded-proto'] ?? 'https').split(',')[0].trim() === 'http' ? 'http' : 'https';
  return host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host) ? `${protocol}://${host}` : null;
};

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).send('Method not allowed');
  const origin = publicOrigin(request);
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  response.status(200).send(`User-agent: *\nAllow: /\n\nSitemap: ${origin ? `${origin}/sitemap.xml` : '/sitemap.xml'}\n`);
}
