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
  assert.deepEqual(urls, ['https://www.pinwi.cl/', 'https://www.pinwi.cl/lugares']);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(!xml.includes('<lastmod>'));
  assert.ok(!xml.includes('/app') && !xml.includes('/admin') && !xml.includes('/delegate'));
});

test('public place URLs and metadata are distinct, minimal and truthful', () => {
  const places = [
    { id: 'public-a', name: 'Biblioteca de Ñuñoa', address: 'Irarrázaval 123, Ñuñoa', imageUrl: 'https://example.test/main.png' },
    { id: 'public-b', name: 'Biblioteca de Ñuñoa', address: null, imageUrl: null },
  ];
  const paths = places.map(seo.getPublicPlacePath);
  assert.notEqual(paths[0], paths[1]);
  assert.match(paths[0], /^\/lugar\/biblioteca-de-nunoa-public-a$/);
  assert.equal([...seo.renderSitemap(places).matchAll(/<loc>/g)].length, 4);
  for (const [index, place] of places.entries()) {
    const page = seo.getPageSeo(paths[index], places);
    assert.equal(page.indexable, true);
    assert.equal(page.canonical, seo.SITE_ORIGIN + paths[index]);
    assert.ok(page.title.includes(place.name));
    const graph = page.schema['@graph'];
    const entity = graph.find(entity => entity['@type'] === 'Place');
    assert.equal(entity.name, place.name);
    assert.equal(entity.address, place.address ?? undefined);
    assert.equal(entity.image, place.imageUrl ?? undefined);
    assert.equal(graph.find(entity => entity['@type'] === 'BreadcrumbList').itemListElement.length, 3);
    for (const field of ['geo', 'openingHours', 'priceRange', 'aggregateRating', 'telephone', 'amenityFeature']) assert.ok(!(field in entity));
    assert.ok(seo.renderSeoHead(page).includes(place.imageUrl ?? seo.SOCIAL_IMAGE));
  }
  assert.equal(seo.getPageSeo('/lugar/no-publicado', places).indexable, false);
  assert.equal(seo.getPageSeo(paths[0], []).canonical, undefined);
  const hostile = { id: 'public-x', name: '</script><script>bad()</script>', address: '" onload="bad', imageUrl: null };
  const head = seo.renderSeoHead(seo.getPublicPlaceSeo(hostile));
  assert.ok(!head.includes('<script>bad()'));
  assert.ok(head.includes('\\u003c/script>'));
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
