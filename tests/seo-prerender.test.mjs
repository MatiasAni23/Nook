import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('public prerender renders minimal place cards and never requests account or place details', async () => {
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
    const places = Array.from({ length: 205 }, (_, index) => ({ id: `public-${index}`, name: `Biblioteca ${index}`, imageUrl: 'https://example.test/cover.jpg' }));
    const landing = renderPublicPage('/', places);
    assert.equal([...landing.matchAll(/<h1\b/g)].length, 1);
    assert.ok(landing.includes('Encuentra tu espacio para') && landing.includes('Un espacio para cada idea.'));
    assert.equal([...landing.matchAll(/class="landing-place-card"/g)].length, 205);
    assert.ok(landing.includes('Biblioteca 204') && landing.includes('https://example.test/cover.jpg'));
    assert.ok(landing.includes('continuar=%2Fapp%2Fplace%2Fpublic-204'));
    assert.ok(!landing.includes('Mapa público de espacios'));
    assert.doesNotMatch(landing, /lugares por descubrir|Mostrando \d|Página \d+ de \d+/);
    assert.ok(landing.includes('Estudiantes') || landing.includes('estudiantes y trabajadores'));
    for (const pathname of ['/terminos', '/privacidad']) {
      const legal = renderPublicPage(pathname);
      assert.equal([...legal.matchAll(/<h1\b/g)].length, 1);
      if (pathname === '/terminos') {
        assert.ok(legal.includes('Condiciones de uso de Pinwi'));
        assert.ok(legal.includes('info@pinwi.cl'));
        assert.doesNotMatch(legal, /borrador|demostraci[oó]n|simulaci[oó]n|modo (?:de )?prueba|pendiente antes de publicaci[oó]n|documento en preparaci[oó]n/i);
      } else {
        assert.ok(legal.includes('Documento en preparación'));
      }
    }
    for (const pathname of ['/app', '/admin', '/delegate-invite']) assert.throws(() => renderPublicPage(pathname), /Only reviewed public/);
    assert.deepEqual(requests, []);
  } finally { globalThis.fetch = originalFetch; await server.close(); }
});
