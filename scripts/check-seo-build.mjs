import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('dist'), origin = 'https://www.pinwi.cl';
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
const snapshotPattern = /<script id="pinwi-public-places" type="application\/json">([\s\S]*?)<\/script>/;
const places = JSON.parse(home.match(snapshotPattern)?.[1] ?? 'null');
assert.ok(Array.isArray(places), 'Public catalogue snapshot is present');
const paths = places.map(place => {
  const slug = place.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 90).replace(/^-|-$/g, '') || 'espacio';
  return '/lugar/' + slug + '-' + place.id;
});
const files = [['index.html', origin + '/', true], ['lugares.html', origin + '/lugares', true], ['privacidad.html', origin + '/privacidad', false], ['terminos.html', origin + '/terminos', false], ['app-shell.html', null, false], ...paths.map(path => [path.slice(1) + '.html', origin + path, true])];
for (const [file, canonical, indexable] of files) {
  const html = readFileSync(resolve(root, file), 'utf8');
  assert.equal([...html.matchAll(/<title>/g)].length, 1, file);
  assert.equal([...html.matchAll(/<meta name="robots"/g)].length, 1, file);
  assert.equal([...html.matchAll(/rel="canonical"/g)].length, canonical ? 1 : 0, file);
  assert.ok(html.includes(indexable ? 'content="index, follow' : 'content="noindex,'), file);
  assert.ok(!html.includes('https://pinwi.cl') && !html.includes('file:///') && !html.includes('pinwi:seo -->'), file);
  if (canonical) assert.ok(html.includes('href="' + canonical + '"'), file);
  if (file === 'app-shell.html') assert.ok(html.includes('<div id="root"></div>') && !html.includes('application/ld+json'));
  else assert.equal([...html.matchAll(/<h1\b/g)].length, 1, file);
  if (indexable) {
    const snapshot = JSON.parse(html.match(snapshotPattern)?.[1] ?? 'null');
    assert.deepEqual(snapshot, places, file + ': minimal public snapshot');
    for (const place of snapshot) {
      assert.deepEqual(Object.keys(place).sort(), ['address', 'id', 'imageUrl', 'name']);
      assert.ok(place.address === null || typeof place.address === 'string');
    }
    if (file === 'index.html' || file === 'lugares.html') {
      assert.equal([...html.matchAll(file === 'index.html' ? /class="landing-place-card"/g : /class="public-place-card"/g)].length, places.length);
      for (const path of paths) assert.ok(html.includes('href="' + path + '"'), 'Crawlable link to ' + path);
    } else {
      const index = paths.findIndex(path => file === path.slice(1) + '.html');
      const place = places[index];
      const schema = JSON.parse(html.match(/<script id="pinwi-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? 'null');
      const entity = schema['@graph'].find(item => item['@type'] === 'Place');
      assert.equal(entity.name, place.name);
      assert.equal(entity.address, place.address ?? undefined);
      assert.equal(entity.image, place.imageUrl ?? undefined);
      assert.ok(html.includes('continuar=%2Fapp%2Fplace%2F' + place.id));
      assert.ok(html.includes('href="/lugares"'));
    }
    assert.ok(!html.includes('maps.googleapis.com'));
  }
  for (const match of html.matchAll(/(?:src|href)="(\/(?:assets|social|brand)\/[^"?#]+|\/(?:favicon[^"?#]*|apple-touch-icon\.png))"/g)) assert.ok(existsSync(resolve(root, '.' + match[1])), 'Missing asset ' + match[1]);
}
const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.deepEqual(urls.sort(), [origin + '/', origin + '/lugares', ...paths.map(path => origin + path)].sort());
assert.equal(new Set(urls).size, urls.length);
assert.ok(!sitemap.includes('<lastmod>'));
const robots = readFileSync(resolve(root, 'robots.txt'), 'utf8');
assert.ok(robots.includes('Sitemap: ' + origin + '/sitemap.xml'));
console.log(`SEO checked: ${places.length} public place pages, directory, crawlable links, minimal snapshots, canonicals, schema, sitemap and private shell.`);
