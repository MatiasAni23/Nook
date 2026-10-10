import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

let server, cache, management, reports, dashboard, places, timeline;
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
let now, calls, fail, release, delegateName;
const delegateId = "70000000-0000-4000-8000-000000000001";
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: { port: 24684 } },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("http://127.0.0.1:9"),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY":
        JSON.stringify("test-key"),
    },
  });
  cache = await server.ssrLoadModule("/src/app/services/adminDataCache.ts");
  management = await server.ssrLoadModule(
    "/src/app/services/adminManagementService.ts",
  );
  reports = await server.ssrLoadModule(
    "/src/app/services/reportTicketService.ts",
  );
  dashboard = await server.ssrLoadModule(
    "/src/app/services/adminDashboardService.ts",
  );
  places = await server.ssrLoadModule("/src/app/services/placeService.ts");
  timeline = await server.ssrLoadModule(
    "/src/app/features/admin/reservationTimeline.ts",
  );
});
after(async () => {
  Date.now = originalNow;
  globalThis.fetch = originalFetch;
  await server?.close();
});
beforeEach(() => {
  now = originalNow();
  Date.now = () => now;
  management.clearAdminManagementCache();
  places.clearPlacesCache();
  calls = [];
  fail = false;
  delegateName = "Delegado de prueba";
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    assert.equal(url.origin, "http://127.0.0.1:9");
    calls.push({ path: url.pathname, method: options.method || "GET" });
    if (fail) return response({ message: "Service unavailable" }, 503);
    if (url.pathname.endsWith("/delegates_with_places"))
      return response([
        {
          id: delegateId,
          user_id: delegateId,
          name: delegateName,
          status: "active",
          assigned_place_ids: [],
          places_count: 0,
        },
      ]);
    if (url.pathname.endsWith("/place_reports") && options.method === "PATCH")
      return response({
        id: "report",
        place_id: "place",
        status: "resolved",
        type: "other",
      });
    return response([]);
  };
});

test("revisiting delegates reuses the response for five minutes and deduplicates simultaneous reads", async () => {
  const [first, second] = await Promise.all([
    management.listManagedDelegates(),
    management.listManagedDelegates(),
  ]);
  assert.equal(first, second);
  assert.equal(calls.length, 1);
  assert.equal(management.getCachedManagedDelegates()[0].name, delegateName);
  now += 4 * 60 * 1000;
  await management.listManagedDelegates();
  assert.equal(calls.length, 1);
  now += 60 * 1000 + 1;
  delegateName = "Nombre actualizado";
  assert.equal((await management.listManagedDelegates())[0].name, delegateName);
  assert.equal(calls.length, 2);
});

test("failed background refresh preserves the previous snapshot and can be retried", async () => {
  await management.listManagedDelegates();
  now += cache.ADMIN_DATA_TTL_MS + 1;
  fail = true;
  await assert.rejects(management.listManagedDelegates());
  assert.equal(management.getCachedManagedDelegates()[0].name, delegateName);
  fail = false;
  delegateName = "Después del reintento";
  assert.equal((await management.listManagedDelegates())[0].name, delegateName);
});

test("home and statistics reuse their snapshots across navigation", async () => {
  await dashboard.adminOverviewSource.load();
  const homeRequests = calls.length;
  assert.ok(dashboard.adminOverviewSource.peek());
  await dashboard.adminOverviewSource.load();
  assert.equal(calls.length, homeRequests);
  await dashboard.adminStatisticsSource.load();
  const statsRequests = calls.length;
  await dashboard.adminStatisticsSource.load();
  assert.equal(calls.length, statsRequests);
  now += cache.ADMIN_DATA_TTL_MS + 1;
  await dashboard.adminStatisticsSource.load();
  assert.ok(calls.length > statsRequests);
});

test("manual refresh bypasses freshness without losing the visible snapshot", async () => {
  await management.listManagedDelegates();
  delegateName = "Actualización manual";
  assert.equal(
    (await management.listManagedDelegates({ forceRefresh: true }))[0].name,
    delegateName,
  );
  assert.equal(calls.length, 2);
});

test("a later statistics visit cannot extend the freshness of an older catalogue", async () => {
  await places.listPlaces();
  now += 4 * 60 * 1000;
  await dashboard.adminStatisticsSource.load();
  assert.equal(dashboard.adminStatisticsSource.remaining(), 60 * 1000);
  const initialReads = calls.filter((call) =>
    call.path.endsWith("/rpc/list_public_places"),
  ).length;
  now += 60 * 1000 + 1;
  await dashboard.adminStatisticsSource.load();
  assert.equal(
    calls.filter((call) => call.path.endsWith("/rpc/list_public_places"))
      .length,
    initialReads + 1,
  );
});

test("account changes clear private snapshots, but refreshing the same account does not", async () => {
  cache.setAdminCacheAccount("account-a");
  await management.listManagedDelegates();
  cache.setAdminCacheAccount("account-a");
  assert.ok(management.getCachedManagedDelegates());
  cache.setAdminCacheAccount("account-b");
  assert.equal(management.getCachedManagedDelegates(), null);
  await management.listManagedDelegates();
  cache.setAdminCacheAccount(null);
  assert.equal(management.getCachedManagedDelegates(), null);
});

test("a pending response cannot refill a cleared cache after logout or a mutation", async () => {
  let started;
  const received = new Promise((resolve) => {
    started = resolve;
  });
  globalThis.fetch = async () => {
    started();
    await new Promise((resolve) => {
      release = resolve;
    });
    return response([
      {
        id: delegateId,
        user_id: delegateId,
        name: "Old session",
        status: "active",
      },
    ]);
  };
  const pending = management.listManagedDelegates();
  await received;
  management.clearAdminManagementCache();
  release();
  await assert.rejects(pending, /sesión o los datos cambiaron/);
  assert.equal(management.getCachedManagedDelegates(), null);
});

test("confirmed report and place changes invalidate dependent overview and statistics caches", async () => {
  await dashboard.adminOverviewSource.load();
  await dashboard.adminStatisticsSource.load();
  await reports.updateReportTicketStatus("report", "resolved");
  assert.equal(dashboard.adminOverviewSource.peek(), null);
  assert.equal(dashboard.adminStatisticsSource.peek(), null);
  await dashboard.adminOverviewSource.load();
  places.clearPlacesCache();
  assert.equal(dashboard.adminOverviewSource.peek(), null);
});

test("a user status change requires a matching row confirmed by the server", async () => {
  globalThis.fetch = async (input, options) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    assert.equal(url.origin, "http://127.0.0.1:9");
    assert.equal(options.method, "PATCH");
    assert.equal(url.searchParams.get("select"), "id,status");
    return response({ message: "No matching row", code: "PGRST116" }, 406);
  };
  await assert.rejects(
    management.updateManagedUserStatus(delegateId, "suspended"),
  );
  globalThis.fetch = async () => response({ id: delegateId, status: "active" });
  await assert.rejects(
    management.updateManagedUserStatus(delegateId, "suspended"),
    /no confirmó/,
  );
  globalThis.fetch = async () =>
    response({ id: delegateId, status: "suspended" });
  await management.updateManagedUserStatus(delegateId, "suspended");
});

test("failed profile or statistics queries never become invented zero counters", async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.pathname.endsWith("/users"))
      return response([
        { id: delegateId, name: "Cuenta", role: "student", status: "active" },
      ]);
    if (url.pathname.endsWith("/users_with_stats"))
      return response({ message: "Access denied", code: "42501" }, 403);
    return response([]);
  };
  await assert.rejects(management.listManagedUsers());
  assert.equal(management.getCachedManagedUsers(), null);
});

test("an empty user list does not query profile or statistics tables", async () => {
  await management.listManagedUsers();
  assert.deepEqual(
    calls.map((call) => call.path),
    ["/rest/v1/users"],
  );
});

test("invalid invitation contact data is rejected before any request or partial record", async () => {
  await assert.rejects(
    management.createDelegateInvitation({
      name: "Invitado",
      email: "correo-incompleto",
      phone: "+56 9 1234 5678",
      assignedPlaces: [],
    }),
    /correo válido/,
  );
  assert.equal(calls.length, 0);
});

test("reservation graphs include the entire 30 or 90 day period and ignore future or older events", () => {
  const now = new Date("2026-10-10T15:00:00Z");
  const events = [
    new Date("2026-07-15T15:00:00Z"),
    new Date("2026-09-12T15:00:00Z"),
    new Date("2026-09-17T18:00:00Z"),
    now,
    new Date("2026-07-01T15:00:00Z"),
    new Date("2026-10-11T15:00:00Z"),
  ];
  const days90 = timeline.buildReservationTimeline(events, 90, now);
  const days30 = timeline.buildReservationTimeline(events, 30, now);
  assert.equal(days90.length, 13);
  assert.equal(days30.length, 5);
  assert.equal(
    days90.reduce((total, bin) => total + bin.reservas, 0),
    4,
  );
  assert.equal(
    days30.reduce((total, bin) => total + bin.reservas, 0),
    3,
  );
});
