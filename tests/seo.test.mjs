import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const module = { exports: {} };
const compiled = ts.transpileModule(readFileSync('src/app/seo/siteSeo.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext('(function(exports,module){' + compiled + '\n})', {})(module.exports, module);
const seo = module.exports;

test('the sitemap contains only reviewed indexable public canonicals, with no invented dates', () => {
  const xml = seo.renderSitemap();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, ['https://www.pinwi.cl/']);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(!xml.includes('<lastmod>'));
  assert.ok(!xml.includes('/app') && !xml.includes('/admin') && !xml.includes('/delegate'));
});

test('auth, private records, legal drafts and unknown paths never inherit indexable homepage metadata', () => {
  for (const path of ['/app', '/app/place/private-record?token=private-token', '/admin/management', '/delegate/reservations', '/delegate-invite?token=private-token', '/recover-password', '/verify-account', '/iniciar-sesion', '/privacidad', '/terminos', '/unknown', '/application']) {
    const page = seo.getPageSeo(path);
    const head = seo.renderSeoHead(page);
    assert.equal(page.indexable, false, path);
    assert.match(head, /content="noindex,/);
    assert.ok(!head.includes('private-token') && !head.includes('private-record'));
    assert.ok(!head.includes('application/ld+json'));
    if (!['/privacidad', '/terminos'].includes(path)) assert.ok(!head.includes('rel="canonical"'));
  }
  assert.equal(seo.getPageSeo('/?utm_source=example').canonical, 'https://www.pinwi.cl/');
});

test('public metadata has one canonical, uses www for sharing, and escapes HTML', () => {
  const head = seo.renderSeoHead(seo.getPageSeo('/'));
  assert.equal([...head.matchAll(/rel="canonical"/g)].length, 1);
  assert.ok(!head.includes('https://pinwi.cl'));
  assert.ok(head.includes('es_CL') && head.includes('summary_large_image'));
  const hostile = seo.renderSeoHead({ ...seo.getPageSeo('/'), title: '</title><script>bad</script>', description: '" onload="bad' });
  assert.ok(!hostile.includes('<script>bad'));
  assert.ok(hostile.includes('&lt;/title&gt;'));
});

test('robots allows public rendering and reading noindex without blocking required assets', () => {
  const robots = seo.renderRobots();
  assert.match(robots, /Sitemap: https:\/\/www\.pinwi\.cl\/sitemap\.xml/);
  assert.ok(!robots.includes('Disallow: /\n'));
  for (const path of ['/assets', '/app', '/admin', '/delegate', '/privacidad']) assert.ok(!robots.includes('Disallow: ' + path));
});

test('structured data identifies the existing brand and website without fabricated business or ratings', () => {
  const data = seo.getStructuredData();
  assert.equal(data['@graph'].length, 2);
  assert.equal(data['@graph'][0].name, 'Pinwi');
  assert.equal(data['@graph'][1].inLanguage, 'es-CL');
  for (const field of ['aggregateRating', 'address', 'telephone', 'sameAs', 'legalName', 'SearchAction']) assert.ok(!JSON.stringify(data).includes(field));
});

test('Vercel preserves security headers and routes private shells without a blanket public HTML fallback', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
  assert.equal(config.cleanUrls, true);
  assert.equal(config.buildCommand, 'npm run build');
  assert.ok(!config.rewrites.some(rule => rule.source === '/(.*)' || rule.destination === '/index.html'));
  assert.ok(config.headers[0].headers.some(header => header.key === 'Content-Security-Policy'));
  for (const source of ['/app/:path*', '/admin/:path*', '/delegate/:path*', '/iniciar-sesion', '/recover-password', '/verify-account', '/delegate-invite']) {
    assert.equal(config.rewrites.find(rule => rule.source === source)?.destination, '/app-shell');
    assert.ok(config.headers.find(rule => rule.source === source).headers.some(header => header.key === 'X-Robots-Tag' && header.value.includes('noindex')));
  }
});
