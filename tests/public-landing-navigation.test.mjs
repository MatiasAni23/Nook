import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const compiled = ts.transpileModule(readFileSync('src/app/features/public-places/publicLandingNavigation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function newDocument() {
  const module = { exports: {} };
  vm.runInNewContext('(function(exports,module){' + compiled + '\n})', {})(module.exports, module);
  return module.exports;
}

test('back navigation restores only the matching landing history visit in this document', () => {
  const navigation = newDocument();
  const path = '/lugar/biblioteca-public-1';
  const view = { scrollTop: 940, carouselPage: 3, openerHref: path };
  navigation.rememberPublicLandingView('modal-visit', path, view);
  const restored = navigation.readPublicLandingView('modal-visit', path);
  assert.equal(JSON.stringify(restored), JSON.stringify(view));
  assert.equal(navigation.readPublicLandingView('another-visit', path), null);
  assert.equal(navigation.readPublicLandingView('modal-visit', '/lugar/another-place'), null);
  restored.carouselPage = 0;
  assert.equal(navigation.readPublicLandingView('modal-visit', path).carouselPage, 3);
  assert.equal(newDocument().readPublicLandingView('modal-visit', path), null, 'A reload or new tab has no modal presentation state');
});

test('public presentation memory excludes private routes and remains bounded', () => {
  const navigation = newDocument();
  const view = { scrollTop: 500, carouselPage: 2, openerHref: '/lugar/public' };
  for (const path of ['/iniciar-sesion', '/app/place/private', '/admin', '/delegate']) {
    navigation.rememberPublicLandingView('private', path, view);
    assert.equal(navigation.readPublicLandingView('private', path), null);
  }
  for (let index = 0; index < 100; index++) navigation.rememberPublicLandingView('visit-' + index, '/', view);
  assert.equal(navigation.readPublicLandingView('visit-0', '/'), null);
  assert.equal(navigation.readPublicLandingView('visit-99', '/').carouselPage, 2);
});
