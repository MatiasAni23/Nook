import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('accepting an invitation invalidates the student profile cached before promotion', async () => {
  const server = await createServer({
    server: { middlewareMode: true, hmr: { port: 24679 } },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:9'),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('test-key'),
    },
  });
  const originalFetch = globalThis.fetch;
  const id = '00000000-0000-4000-8000-000000000001';
  const token = '00000000-0000-4000-8000-000000000002';
  let role = 'student';
  let profileReads = 0;
  const requests = [];
  // Exercise the real service modules and Supabase query builder. Every HTTP
  // request is intercepted; this test never connects to an external account.
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    requests.push(url.pathname);
    let body;
    if (url.pathname === '/rest/v1/users') {
      profileReads += 1;
      body = [{ id, name: 'Invitado', role, status: 'active', phone: null, avatar_url: null }];
    } else if (url.pathname === '/rest/v1/user_profiles') {
      body = [];
    } else if (url.pathname === '/rest/v1/delegates') {
      body = [{ status: 'active' }];
    } else if (url.pathname === '/rest/v1/rpc/claim_delegate_invitation') {
      assert.deepEqual(JSON.parse(options.body), { invitation_token: token });
      role = 'delegate';
      body = null;
    } else {
      throw new Error(`Unexpected request: ${url.pathname}`);
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const { supabase } = await server.ssrLoadModule('/src/app/lib/supabase.ts');
    const user = { id, email: 'invited@pinwi.test', user_metadata: {} };
    supabase.auth.getUser = async () => ({ data: { user }, error: null });
    supabase.auth.getSession = async () => ({ data: { session: { user, access_token: 'test-token' } }, error: null });
    const profiles = await server.ssrLoadModule('/src/app/services/currentUserService.ts');
    const delegates = await server.ssrLoadModule('/src/app/services/adminManagementService.ts');
    assert.equal((await profiles.getCurrentUserProfile()).role, 'student');
    assert.equal((await profiles.getCurrentUserProfile()).role, 'student');
    assert.equal(profileReads, 1);
    await delegates.claimDelegateInvitation(token);
    const promoted = await profiles.getCurrentUserProfile();
    assert.equal(promoted.role, 'delegate');
    assert.equal(promoted.delegateStatus, 'active');
    assert.equal(profileReads, 2);
    assert.equal(requests.filter(path => path.includes('/rpc/')).length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await server.close();
  }
});
