import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server, chat, client;
const originalFetch = globalThis.fetch;
const account = '10000000-0000-4000-8000-000000000001';
const peer = '20000000-0000-4000-8000-000000000002';
const row = (id, text = 'Mensaje') => ({ id, sender_id: peer, receiver_id: account, message: text, created_at: '2026-10-24T10:00:00Z', read: false, read_at: null });
const json = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
before(async () => {
  server = await createServer({ cacheDir: 'node_modules/.vite-chat-tests', optimizeDeps: { noDiscovery: true, entries: [], include: [] }, server: { middlewareMode: true, hmr: { port: 24739 } }, define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:9'),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('test-key'),
  } });
  ({ supabase: client } = await server.ssrLoadModule('/src/app/lib/supabase.ts'));
  chat = await server.ssrLoadModule('/src/app/services/chatService.ts');
});
after(async () => { chat.clearChatServiceCaches(); globalThis.fetch = originalFetch; await client.auth.stopAutoRefresh(); await server.close(); });

test('simultaneous chat reads share a request; fresh cache and an explicit refresh are distinct', async () => {
  chat.clearChatServiceCaches(); let reads = 0;
  globalThis.fetch = async () => { reads++; return json([row('first')]); };
  const [a, b] = await Promise.all([chat.getChatMessagesForUser(account), chat.getChatMessagesForUser(account)]);
  assert.equal(reads, 1); assert.equal(a[0].id, b[0].id);
  await chat.getChatMessagesForUser(account); assert.equal(reads, 1);
  await chat.getChatMessagesForUser(account, { forceRefresh: true }); assert.equal(reads, 2);
});

test('a slow snapshot preserves messages and confirmed read receipts received during the request', async () => {
  chat.clearChatServiceCaches(); let release, started;
  const waiting = new Promise(resolve => { started = resolve; });
  globalThis.fetch = async () => { started(); await new Promise(resolve => { release = resolve; }); return json([row('first')]); };
  const request = chat.getChatMessagesForUser(account); await waiting;
  const confirmed = { id: 'first', senderId: peer, receiverId: account, text: 'Mensaje', createdAt: new Date('2026-10-24T10:00:00Z'), read: true, readAt: new Date() };
  chat.upsertCachedChatMessage(account, confirmed);
  chat.upsertCachedChatMessage(account, { ...confirmed, id: 'second', text: 'Nuevo', read: false });
  release(); const messages = await request;
  assert.equal(messages.length, 2); assert.equal(messages.find(m => m.id === 'first').read, true);
  assert.equal(chat.getCachedChatMessagesForUser(account).length, 2);
});

test('bulk read receipts update the existing cache after one confirmed request without changing message content', async () => {
  chat.clearChatServiceCaches(); let writes = 0;
  chat.upsertCachedChatMessage(account, { id: 'sent', senderId: account, receiverId: peer, text: 'Original', createdAt: new Date(), read: false, readAt: null });
  globalThis.fetch = async (input, options) => {
    writes++; assert.equal(options.method, 'PATCH');
    const url = new URL(typeof input === 'string' ? input : input.url);
    assert.equal(url.searchParams.get('receiver_id'), `eq.${account}`);
    assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(), ['read', 'read_at']);
    return json(Array.from({ length: 30 }, (_, n) => ({ ...row('read-' + n), read: true, read_at: new Date().toISOString() })));
  };
  const read = await chat.markChatMessagesAsRead({ currentUserId: account, otherUserId: peer });
  assert.equal(writes, 1); assert.equal(read.length, 30);
  const cached = chat.getCachedChatMessagesForUser(account);
  assert.equal(cached.length, 31); assert.equal(cached.find(m => m.id === 'sent').text, 'Original');
  assert.equal(cached.filter(m => m.read).length, 30);
});

test('an unrelated live message cannot revert a newer read receipt returned by the server', async () => {
  chat.clearChatServiceCaches();
  chat.upsertCachedChatMessage(account, { id: 'older', senderId: peer, receiverId: account, text: 'Anterior', createdAt: new Date(), read: false, readAt: null });
  let release, started; const waiting = new Promise(resolve => { started = resolve; });
  globalThis.fetch = async () => { started(); await new Promise(resolve => { release = resolve; }); return json([{ ...row('older'), read: true, read_at: new Date().toISOString() }]); };
  const request = chat.getChatMessagesForUser(account, { forceRefresh: true }); await waiting;
  chat.upsertCachedChatMessage(account, { id: 'live', senderId: peer, receiverId: account, text: 'Nuevo', createdAt: new Date(), read: false, readAt: null });
  release(); const messages = await request;
  assert.equal(messages.find(message => message.id === 'older').read, true);
  assert.equal(messages.length, 2);
});

test('the chat and notification banner share one feed and release it only after the last subscriber', () => {
  chat.clearChatServiceCaches();
  const originalChannel = client.channel, originalRemove = client.removeChannel;
  let subscriptions = 0, removals = 0; const callbacks = {};
  client.channel = () => ({ on: function (_, filter, callback) { callbacks[filter.event] = callback; return this; }, subscribe() { subscriptions++; } });
  client.removeChannel = async () => { removals++; };
  try {
    const first = [], second = [];
    const stopFirst = chat.subscribeToChatMessages(account, message => first.push(message));
    const stopSecond = chat.subscribeToChatMessages(account, message => second.push(message));
    assert.equal(subscriptions, 1);
    callbacks.INSERT({ new: row('one') }); assert.equal(first.length, 1); assert.equal(second.length, 1);
    callbacks.INSERT({ new: { ...row('foreign'), receiver_id: peer } }); assert.equal(first.length, 1);
    stopFirst(); assert.equal(removals, 0);
    callbacks.UPDATE({ new: { ...row('one'), read: true } }); assert.equal(first.length, 1); assert.equal(second.length, 2);
    stopSecond(); assert.equal(removals, 1);
    const stopThird = chat.subscribeToChatMessages(account, () => assert.fail('A late event must not cross logout'));
    chat.clearChatServiceCaches(); callbacks.INSERT({ new: row('late') });
    assert.equal(chat.getCachedChatMessagesForUser(account), null); stopThird();
  } finally { client.channel = originalChannel; client.removeChannel = originalRemove; }
});

test('the catalog and its authorized spaces start in parallel instead of adding two network waits', async () => {
  const places = await server.ssrLoadModule('/src/app/services/placeService.ts');
  places.clearPlacesCache();
  const waiting = new Map(); let started;
  const bothStarted = new Promise(resolve => { started = resolve; });
  globalThis.fetch = async input => {
    const path = new URL(typeof input === 'string' ? input : input.url).pathname;
    return new Promise(resolve => { waiting.set(path, resolve); if (waiting.size === 2) started(); });
  };
  const request = places.listPlaces();
  let timeout;
  try {
    await Promise.race([bothStarted, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Catalog reads are still sequential')), 3000); })]);
    assert.ok(waiting.has('/rest/v1/rpc/list_public_places'));
    assert.ok(waiting.has('/rest/v1/place_spaces'));
  } finally {
    clearTimeout(timeout); for (const release of waiting.values()) release(json([]));
  }
  assert.deepEqual(await request, []);
});
