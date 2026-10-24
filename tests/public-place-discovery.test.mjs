import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTypescript } from './helpers/loadTypescript.mjs';
const discovery = loadTypescript('src/app/seo/publicPlaceDiscovery.ts');
const seo = loadTypescript('src/app/seo/siteSeo.ts');
const place = (id,type,zone) => ({id,name:'Lugar '+id,type,zone,address:'Dirección',imageUrl:null,description:'Descripción del lugar'});

test('related places rank real locality and type matches, excluding tests and unrelated venues',()=>{
 const selected=place('selected','library','Santiago');
 const both=place('both','library','Santiago Centro'),sameZone=place('zone','coworking','Santiago'),sameType=place('type','library','Providencia');
 const unrelated=place('unrelated','office','Vitacura');
 const demo=place('9b701da9-eb76-4c10-b1c2-96dca8d398e5','library','Santiago');
 assert.deepEqual(discovery.getRelatedPublicPlaces(selected,[unrelated,demo,sameType,sameZone,both,selected]).map(item=>item.id),['both','zone','type']);
 assert.deepEqual(discovery.getRelatedPublicPlaces(place('unknown',null,null),[unrelated]),[]);
});

test('collections contain only matching published places and do not create empty or single-venue area pages',()=>{
 const rows=[place('a','coworking','Providencia'),place('b','coworking','Providencia'),place('c','library','Santiago'),place('d','library','Santiago Centro'),place('e','library','Cerrillos / Maipú'),place('9b701da9-eb76-4c10-b1c2-96dca8d398e5','coworking','Los Alamos')];
 const collections=discovery.getPublicCollections(rows);
 assert.deepEqual(collections.find(item=>item.path==='/coworks/providencia').places.map(item=>item.id),['a','b']);
 assert.deepEqual(collections.find(item=>item.path==='/bibliotecas/santiago').places.map(item=>item.id),['c','d']);
 assert.ok(!collections.some(item=>/maipu|cerrillos|alamos|cafes/.test(item.path)));
 assert.equal(discovery.getPlaceLocality(rows[4]),null);
 assert.equal(new Set(collections.map(item=>item.path)).size,collections.length);
 for(const collection of collections) for(const member of collection.places) {
   if(collection.kind) assert.equal(member.type,collection.kind);
   if(collection.locality) assert.equal(discovery.getPlaceLocality(member).slug,collection.locality.slug);
 }
});

test('SEO uses known place intent and location without inventing amenities and keeps the test record noindex',()=>{
 const row=place('real','library','Santiago');
 const page=seo.getPublicPlaceSeo(row);
 assert.match(page.title,/Santiago.*estudiar/);
 assert.ok(!page.description.includes('Inicia sesión'));
 assert.ok(!/wifi|enchufes|silencio|gratis/i.test(page.description));
 const entity=page.schema['@graph'].find(item=>item['@type']==='Library');
 assert.equal(entity.address.addressLocality,'Santiago');
 const demo=place('9b701da9-eb76-4c10-b1c2-96dca8d398e5','coworking','Los Alamos');
 assert.equal(seo.getPublicPlaceSeo(demo).indexable,false);
 assert.match(seo.getRobotsDirective(seo.getPublicPlaceSeo(demo)),/^noindex, follow/);
 assert.ok(!seo.renderSitemap([row,demo]).includes(demo.id));
 assert.ok(seo.getPublicPages([row,demo]).some(page=>page.path===seo.getPublicPlacePath(demo)),'Test page remains available');
});
