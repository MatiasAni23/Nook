import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadTypescript } from './helpers/loadTypescript.mjs';

test('SEO prerender leaves the running development dependency cache untouched', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'pinwi-prerender-'));
  try {
    const devCache = path.join(root, 'node_modules/.vite/deps');
    await mkdir(devCache, { recursive: true });
    await mkdir(path.join(root, 'src/app/seo'), { recursive: true });
    await mkdir(path.join(root, 'dist'), { recursive: true });
    const marker = path.join(devCache, 'running-browser-react.js');
    const reactModule = 'export const instance = "already loaded by the browser";';
    await writeFile(marker, reactModule);
    await writeFile(path.join(root, 'package.json'), '{"name":"prerender-fixture","type":"module"}');
    await writeFile(path.join(root, 'index.html'), '<div id="root"></div>');
    await writeFile(path.join(root, 'dist/index.html'), '<html><head><!-- pinwi:seo:start --><!-- pinwi:seo:end --></head><body><div id="root"></div></body></html>');
    await writeFile(path.join(root, 'src/app/seo/prerender.tsx'), 'export const renderPublicPage = path => `<p>Rendered ${path}</p>`;');
    const { seoPlugin } = loadTypescript('scripts/seoPlugin.ts');
    const plugin = seoPlugin();
    plugin.configResolved({ root, command: 'build', mode: 'production', build: { outDir: 'dist' }, env: {}, logger: { info() {} } });
    await plugin.closeBundle();
    assert.equal(await readFile(marker, 'utf8'), reactModule);
    assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), /<p>Rendered \/<\/p>/);
    assert.match(await readFile(path.join(root, 'dist/sitemap.xml'), 'utf8'), /https:\/\/www\.pinwi\.cl\/lugares/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
