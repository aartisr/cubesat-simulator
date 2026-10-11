import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

test('public discoverability assets identify the product and its author consistently', () => {
  const index = read('index.html');
  const llms = read('public/llms.txt');
  const readme = read('README.md');

  for (const content of [index, llms, readme]) {
    assert.match(content, /Aarti S Ravikumar/);
    assert.match(content, /https:\/\/ai-aarti\.com/);
  }
  assert.match(index, /application\/ld\+json/);
  assert.match(index, /SoftwareApplication/);
  assert.match(index, /rel="canonical" href="__SITE_URL__\//);
  assert.match(llms, /not flight-qualified ephemeris/i);
});

test('build configuration resolves canonical identity from an explicit production origin', () => {
  const config = read('vite.config.ts');
  assert.match(config, /VITE_SITE_URL/);
  assert.match(config, /transformIndexHtml/);
  assert.match(read('.env.example'), /VITE_SITE_URL/);
});

test('Vercel exposes host-aware robots and sitemap routes for crawler discovery', () => {
  const config = read('vercel.json');
  assert.match(config, /"\/robots\.txt"/);
  assert.match(config, /"\/sitemap\.xml"/);
  assert.match(read('api/robots.js'), /Sitemap:/);
  assert.match(read('api/sitemap.js'), /application\/xml/);
});
