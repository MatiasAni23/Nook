import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const root=resolve('dist'),origin='https://www.pinwi.cl';
const snapshotPattern=/<script id="pinwi-public-places" type="application\/json">([\s\S]*?)<\/script>/;
const home=readFileSync(resolve(root,'index.html'),'utf8');
const places=JSON.parse(home.match(snapshotPattern)?.[1]??'null');
assert.ok(Array.isArray(places));
const server=await createServer({configFile:false,envDir:false,appType:'custom',cacheDir:'node_modules/.vite-seo-check',server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,entries:[]}});
try {
 const seo=await server.ssrLoadModule('/src/app/seo/siteSeo.ts');
 const discovery=await server.ssrLoadModule('/src/app/seo/publicPlaceDiscovery.ts');
 const pages=seo.getPublicPages(places);
 const files=[...pages.map(page=>({file:page.path==='/'?'index.html':page.path.slice(1)+'.html',page})),{file:'app-shell.html',page:seo.getPageSeo('/app')}];
 for(const {file,page} of files) {
  const html=readFileSync(resolve(root,file),'utf8');
  assert.equal([...html.matchAll(/<title>/g)].length,1,file);
  assert.equal([...html.matchAll(/<meta name="robots"/g)].length,1,file);
  assert.equal([...html.matchAll(/rel="canonical"/g)].length,page.canonical?1:0,file);
  assert.ok(html.includes(page.indexable?'content="index, follow':'content="noindex,'),file);
  assert.ok(!html.includes('https://pinwi.cl')&&!html.includes('file:///')&&!html.includes('pinwi:seo -->'),file);
  if(page.canonical) assert.ok(html.includes('href="'+page.canonical+'"'),file);
  if(file==='app-shell.html') assert.ok(html.includes('<div id="root"></div>')&&!html.includes('application/ld+json'));
  else assert.equal([...html.matchAll(/<h1\b/g)].length,1,file);
  if(html.includes('id="pinwi-public-places"')) {
   const snapshot=JSON.parse(html.match(snapshotPattern)[1]);
   assert.deepEqual(snapshot,places,file+': public snapshot');
   for(const row of snapshot) assert.deepEqual(Object.keys(row).sort(),['address','description','id','imageUrl','name','type','zone']);
  }
  if(file==='index.html'||file==='lugares.html') {
   assert.equal([...html.matchAll(file==='index.html'?/class="landing-place-card"/g:/class="public-place-card"/g)].length,places.length);
   for(const row of places) assert.ok(html.includes('href="'+seo.getPublicPlacePath(row)+'"'));
  }
  if(page.path.startsWith('/lugar/')) {
   const row=places.find(row=>seo.getPublicPlacePath(row)===page.path);
   const data=JSON.parse(html.match(/<script id="pinwi-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
   const entity=data['@graph'].find(item=>item['@id']===page.canonical+'#place');
   assert.equal(entity.name,row.name);
   assert.equal(entity.address?.streetAddress,row.address??undefined);
   assert.equal(entity.image,row.imageUrl??undefined);
   assert.equal(entity['@type'],discovery.getPlaceKind(row)?.schemaType??'Place');
   assert.ok(html.includes('continuar=%2Fapp%2Fplace%2F'+row.id));
   assert.ok(html.includes('href="/lugares"'));
   assert.ok(!page.description.includes('Inicia sesión'));
   for(const field of ['geo','openingHours','priceRange','aggregateRating','amenityFeature']) assert.ok(!(field in entity));
  }
  assert.ok(!html.includes('maps.googleapis.com'));
  for(const match of html.matchAll(/(?:src|href)="(\/(?:assets|social|brand)\/[^"?#]+|\/(?:favicon[^"?#]*|apple-touch-icon\.png))"/g)) assert.ok(existsSync(resolve(root,'.'+match[1])),'Missing asset '+match[1]);
 }
 const sitemap=readFileSync(resolve(root,'sitemap.xml'),'utf8');
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
 assert.deepEqual(urls.sort(),pages.filter(page=>page.indexable).map(page=>page.canonical).sort());
 assert.equal(new Set(urls).size,urls.length);
 assert.ok(!sitemap.includes('<lastmod>'));
 for(const row of places.filter(row=>!discovery.isPublicPlaceIndexable(row))) assert.ok(!sitemap.includes(row.id));
 assert.ok(readFileSync(resolve(root,'robots.txt'),'utf8').includes('Sitemap: '+origin+'/sitemap.xml'));
 console.log(`SEO checked: ${places.length} place pages, ${discovery.getPublicCollections(places).length} collections, ${urls.length} sitemap URLs; metadata, public fields, schemas, noindex exceptions and private shell validated.`);
} finally { await server.close(); }
