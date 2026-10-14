import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('public prerender uses the actual views, retains the map, and never requests account or place data', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async target => { requests.push(target); throw new Error('Network is forbidden during prerender'); };
  const server = await createServer({
    mode: 'production', appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null },
    cacheDir: 'node_modules/.vite-seo-tests',
    define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:9'), 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('public-test-key') },
  });
  try {
    const { renderPublicPage } = await server.ssrLoadModule('/src/app/seo/prerender.tsx');
    const landing = renderPublicPage('/');
    assert.equal([...landing.matchAll(/<h1\b/g)].length, 1);
    assert.ok(landing.includes('Encuentra tu lugar.') && landing.includes('Mapa público de espacios'));
    assert.ok(landing.includes('Estudiantes') || landing.includes('estudiantes y trabajadores'));
    for (const pathname of ['/terminos', '/privacidad']) {
      const legal = renderPublicPage(pathname);
      assert.equal([...legal.matchAll(/<h1\b/g)].length, 1);
      assert.ok(legal.includes('Documento en preparación'));
    }
    for (const pathname of ['/app', '/admin', '/delegate-invite']) assert.throws(() => renderPublicPage(pathname), /Only reviewed public/);
    assert.deepEqual(requests, []);
  } finally { globalThis.fetch = originalFetch; await server.close(); }
});
