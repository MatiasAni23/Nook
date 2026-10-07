import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server, chat, profiles;
const originalFetch = globalThis.fetch;
const id = '50000000-0000-4000-8000-000000000001';
before(async () => {
  server = await createServer({ server: { middlewareMode: true, hmr: { port: 24680 } }, define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:9'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('test-key'),
  }});
  chat = await server.ssrLoadModule('/src/app/services/chatService.ts');
  profiles = await server.ssrLoadModule('/src/app/services/currentUserService.ts');
});
after(async () => { globalThis.fetch = originalFetch; await server?.close(); });

test('directory and chat consume only the shared-profile RPC without caching visibility', async () => {
  const requests = [];
  let visible = true;
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    assert.equal(url.pathname, '/rest/v1/rpc/get_shared_profiles');
    requests.push(JSON.parse(options.body));
    return new Response(JSON.stringify(visible ? [{ id, name:'Estudiante', role:'student', avatar_url:null, career:'Carrera', university:null, subjects:[], bio:null }] : []), { headers: { 'Content-Type':'application/json' } });
  };
  assert.equal((await profiles.getChatUsers({role:'student'})).length, 1);
  visible = false;
  assert.equal((await profiles.getChatUsers({role:'student'})).length, 0);
  assert.equal((await chat.getChatUsersByIds([id])).length, 0);
  assert.deepEqual(requests, [
    {target_user_ids:null,student_directory:true},
    {target_user_ids:null,student_directory:true},
    {target_user_ids:[id],student_directory:false},
  ]);
});

test('a chat request resolving after logout cannot repopulate the previous session cache', async () => {
  chat.clearChatServiceCaches();
  let release, started;
  const received = new Promise(resolve => { started = resolve; });
  globalThis.fetch = async () => {
    started();
    await new Promise(resolve => { release = resolve; });
    return new Response(JSON.stringify([{id,sender_id:id,receiver_id:'50000000-0000-4000-8000-000000000002',message:'Privado',created_at:new Date().toISOString(),read:false,read_at:null}]), { headers:{'Content-Type':'application/json'} });
  };
  const pending = chat.getChatMessagesForUser(id);
  await received;
  chat.clearChatServiceCaches();
  release();
  assert.deepEqual(await pending, []);
  assert.equal(chat.getCachedChatMessagesForUser(id), null);
});
