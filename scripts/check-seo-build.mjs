import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('dist');
for (const [file, canonical, indexable] of [['index.html', 'https://www.pinwi.cl/', true], ['privacidad.html', 'https://www.pinwi.cl/privacidad', false], ['terminos.html', 'https://www.pinwi.cl/terminos', false], ['app-shell.html', null, false]]) {
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
    assert.ok(html.includes('Un espacio para cada idea.') && html.includes('Encuentra tu espacio para'));
    assert.ok(!html.includes('Mapa público de espacios') && !html.includes('maps.googleapis.com'));
    const snapshot = html.match(/<script id="pinwi-public-places" type="application\/json">([\s\S]*?)<\/script>/);
    assert.ok(snapshot, 'Public catalogue snapshot is present');
    const places = JSON.parse(snapshot[1]);
    assert.equal([...html.matchAll(/class="landing-place-card"/g)].length, places.length, 'Every public place is present before JavaScript');
    for (const place of places) {
      assert.deepEqual(Object.keys(place).sort(), ['address', 'id', 'imageUrl', 'name']);
      assert.ok(place.address === null || typeof place.address === 'string', 'Public addresses accompany the catalogue snapshot');
      assert.ok(html.includes('continuar=%2Fapp%2Fplace%2F' + place.id));
    }
  }
  for (const match of html.matchAll(/(?:src|href)="(\/(?:assets|social|brand)\/[^"?#]+|\/(?:favicon[^"?#]*|apple-touch-icon\.png))"/g)) assert.ok(existsSync(resolve(root, '.' + match[1])), 'Missing asset ' + match[1]);
}
const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
assert.ok(sitemap.includes('<loc>https://www.pinwi.cl/</loc>') && !sitemap.includes('<lastmod>'));
const robots = readFileSync(resolve(root, 'robots.txt'), 'utf8');
assert.ok(robots.includes('Sitemap: https://www.pinwi.cl/sitemap.xml'));
console.log('SEO build checked: public catalogue rendered without JavaScript, three public pages, private shell, canonical/robots, assets and sitemap.');
