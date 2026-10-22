import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

let server, service, database, requests, failure;
const originalFetch = globalThis.fetch;
const userId = "60000000-0000-4000-8000-000000000001";
const placeId = "60000000-0000-4000-8000-000000000002";
const input = {
  name: "Biblioteca de prueba",
  type: "library",
  category: "study",
  planType: "basic",
  description: "Un espacio de estudio",
  address: "Calle 123",
  zone: "Santiago",
  latitude: -33.45,
  longitude: -70.65,
  hours: "Lun: 08:00 - 18:00",
  capacityMin: 2,
  capacityMax: 12,
  pricePerHour: null,
  websiteUrl: "ejemplo.cl",
  wifi: true,
  outlets: true,
  parking: false,
  quietnessLevel: 4,
  lightingLevel: 3,
  amenities: [{ key: "wifi", name: "WiFi", isAvailable: true }],
  spaces: [
    {
      name: "Sala",
      capacity: 4,
      pricePerHour: 1000,
      billingUnit: "day",
      image: { type: "existing", url: "https://example.test/sala.webp" },
    },
  ],
  imageFiles: [],
};
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

before(async () => {
  server = await createServer({
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: { port: 24683 } },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("http://127.0.0.1:9"),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY":
        JSON.stringify("test-key"),
    },
  });
  const { supabase } = await server.ssrLoadModule("/src/app/lib/supabase.ts");
  supabase.auth.getUser = async () => ({
    data: { user: { id: userId } },
    error: null,
  });
  supabase.auth.getSession = async () => ({
    data: { session: null },
    error: null,
  });
  service = await server.ssrLoadModule("/src/app/services/placeService.ts");
});
after(async () => {
  globalThis.fetch = originalFetch;
  await server?.close();
});
beforeEach(() => {
  service.clearPlacesCache();
  database = new Map();
  requests = [];
  failure = null;
  globalThis.fetch = async (target, options = {}) => {
    const url = new URL(typeof target === "string" ? target : target.url);
    assert.equal(
      url.origin,
      "http://127.0.0.1:9",
      "No request may reach a live backend",
    );
    const method = options.method || "GET";
    const body =
      typeof options.body === "string" ? JSON.parse(options.body) : null;
    requests.push({ path: url.pathname, method, body, query: url.searchParams });
    if (failure?.(url, method))
      return response({ message: "Denied by test policy", code: "42501" }, 403);
    if (url.pathname.startsWith("/storage/v1/object/")) {
      return response(method === "DELETE" ? [] : { Key: url.pathname });
    }
    if (url.pathname.endsWith("/rpc/list_public_places"))
      return response(
        [...database.values()].filter((p) => p.status === "active"),
      );
    if (url.pathname.endsWith("/rpc/delete_managed_place")) {
      const id = body.target_place_id;
      if (!database.has(id)) return response({ message: "place_not_found", code: "P0001" }, 400);
      database.delete(id);
      return response({ id, image_paths: [`${id}/cover.webp`] });
    }
    if (url.pathname.endsWith("/rpc/replace_place_spaces")) {
      return response(body.spaces_json.map((s) => ({ ...s })));
    }
    if (url.pathname.endsWith("/place_spaces")) {
      if (method === "POST")
        return response(
          body.map((s, index) => ({ ...s, id: `space-${index}` })),
        );
      return response([]);
    }
    if (url.pathname.endsWith("/place_amenities")) return response([]);
    if (url.pathname.endsWith("/places")) {
      if (method === "POST") {
        database.set(body.id, { ...body, rating: 0, reviews_count: 0 });
        return response(database.get(body.id));
      }
      const id = url.searchParams.get("id")?.replace("eq.", "");
      if (method === "PATCH") {
        const row = database.get(id);
        const statusFilter = url.searchParams.get("status");
        if (!row || (statusFilter === "in.(active,inactive)" && !["active", "inactive"].includes(row.status)))
          return response({ message: "No rows", code: "PGRST116" }, 406);
        database.set(id, { ...row, ...body });
        return response(database.get(id));
      }
      if (method === "DELETE") {
        database.delete(id);
        return response({ id });
      }
      if (id) return response(database.get(id) ?? null);
      const statusFilter = url.searchParams.get("status");
      return response([...database.values()].filter((row) =>
        statusFilter === "in.(active,inactive)"
          ? ["active", "inactive"].includes(row.status)
          : row.status === "active",
      ));
    }
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  };
});

test("CRUD creates a complete place, reads the full catalogue, edits it and removes it from publication", async () => {
  database.set(placeId, {
    id: placeId,
    name: "Lugar previo",
    status: "active",
    type: "cafe",
    category: "study",
    images: [],
  });
  const created = await service.createPlace(input);
  assert.equal(created.name, input.name);
  assert.equal(created.spaces[0].billingUnit, "day");
  assert.equal(created.amenities[0].key, "wifi");
  assert.equal(
    service.getCachedPlaces(),
    null,
    "A newly created record must not mask the existing catalogue",
  );
  assert.equal((await service.listPlaces()).length, 2);
  assert.equal((await service.getPlaceById(created.id)).name, input.name);
  const updated = await service.updatePlace({
    ...input,
    spaces: input.spaces.map((space, index) => ({ ...space, id: created.spaces[index].id })),
    id: created.id,
    name: "Biblioteca editada",
    images: [{ type: "existing", url: "https://example.test/cover.webp" }],
  });
  assert.equal(updated.name, "Biblioteca editada");
  assert.equal(updated.spaces[0].billingUnit, "day");
  assert.equal(updated.spaces[0].id, created.spaces[0].id, "Editing preserves the space used by reservation schedules");
  assert.ok(!requests.some((request) => request.path.endsWith("/place_spaces") && request.method === "DELETE"));
  assert.equal(updated.images[0], "https://example.test/cover.webp");
  assert.equal(database.get(created.id).website_url, "https://ejemplo.cl");
  await service.deletePlace(created.id);
  assert.equal(
    database.get(created.id).status,
    "inactive",
    "Deletion preserves the record and its history",
  );
  assert.equal((await service.listPlaces()).length, 1);
  assert.ok(
    !requests.some(
      (request) =>
        request.method === "DELETE" && request.path.endsWith("/places"),
    ),
  );
});

test("a failed child insert rolls back a new place and never reports creation success", async () => {
  failure = (url, method) =>
    url.pathname.endsWith("/place_amenities") && method === "POST";
  await assert.rejects(service.createPlace(input));
  assert.equal(database.size, 0);
  assert.equal(service.getCachedPlaces(), null);
});

test("new images upload after parent creation and are cleaned before rolling back a failed child write", async () => {
  failure = (url, method) =>
    url.pathname.endsWith("/place_amenities") && method === "POST";
  await assert.rejects(
    service.createPlace({
      ...input,
      // Minimal WebP signature; HTTP is mocked, but upload validation is real.
      imageFiles: [new File([new Uint8Array([82,73,70,70,0,0,0,0,87,69,66,80])], "cover.webp", { type: "image/webp" })],
    }),
  );
  const insert = requests.findIndex(
    (request) => request.path.endsWith("/places") && request.method === "POST",
  );
  const upload = requests.findIndex(
    (request) =>
      request.path.startsWith("/storage/") && request.method === "POST",
  );
  const cleanup = requests.findIndex(
    (request) =>
      request.path.startsWith("/storage/") && request.method === "DELETE",
  );
  const rollback = requests.findIndex(
    (request) =>
      request.path.endsWith("/places") && request.method === "DELETE",
  );
  assert.ok(
    insert >= 0 && upload > insert && cleanup > upload && rollback > cleanup,
  );
  assert.equal(database.size, 0);
  assert.equal(requests[cleanup].body.prefixes.length, 1);
});

test("a failed rollback tells the operator to inspect the existing record before retrying", async () => {
  failure = (url, method) =>
    url.pathname.endsWith("/place_amenities") ||
    (url.pathname.endsWith("/places") && method === "DELETE");
  await assert.rejects(service.createPlace(input), /se creó.*revísalo/);
  assert.equal(database.size, 1);
});

test("incomplete spaces cannot be cached or opened as an empty successful record", async () => {
  failure = (url) => url.pathname.endsWith("/place_spaces");
  await assert.rejects(service.listPlaces());
  assert.equal(service.getCachedPlaces(), null);
});

test("a denied delete keeps the catalogue record and rejects the operation", async () => {
  const created = await service.createPlace(input);
  await service.listPlaces();
  failure = (url, method) =>
    url.pathname.endsWith("/places") && method === "PATCH";
  await assert.rejects(service.deletePlace(created.id));
  assert.equal(database.get(created.id).status, "active");
  assert.equal(service.getCachedPlaces().length, 1);
});

test("a secondary edit failure invalidates cached data and explains the partial write", async () => {
  const created = await service.createPlace(input);
  await service.listPlaces();
  failure = (url, method) =>
    url.pathname.endsWith("/place_amenities") && method === "POST";
  await assert.rejects(
    service.updatePlace({
      ...input,
      id: created.id,
      name: "Cambio parcial",
      images: [],
    }),
    /Algunos cambios pudieron guardarse/,
  );
  assert.equal(service.getCachedPlaces(), null);
  assert.equal(database.get(created.id).name, "Cambio parcial");
});

test("a pending list response cannot refill the cache after logout or mutation invalidation", async () => {
  let release, started;
  const received = new Promise((resolve) => {
    started = resolve;
  });
  globalThis.fetch = async (target) => {
    const url = new URL(typeof target === "string" ? target : target.url);
    if (url.pathname.endsWith("/rpc/list_public_places")) {
      started();
      await new Promise((resolve) => {
        release = resolve;
      });
      return response([
        {
          id: placeId,
          name: "Dato anterior",
          type: "library",
          category: "study",
          images: [],
        },
      ]);
    }
    return response([]);
  };
  const pending = service.listPlaces();
  await received;
  service.clearPlacesCache();
  release();
  assert.deepEqual(await pending, []);
  assert.equal(service.getCachedPlaces(), null);
});

test("an expired detail record is revalidated and the query excludes inactive places", async () => {
  const originalNow = Date.now;
  const created = await service.createPlace(input);
  await service.listPlaces();
  const expectedName = "Nombre cambiado en el servidor";
  database.set(created.id, { ...database.get(created.id), name: expectedName });
  Date.now = () => originalNow() + 6 * 60 * 1000;
  try {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async (target, options) => {
      const url = new URL(typeof target === "string" ? target : target.url);
      assert.equal(url.searchParams.get("status"), "eq.active");
      return previousFetch(target, options);
    };
    assert.equal((await service.getPlaceById(created.id)).name, expectedName);
  } finally {
    Date.now = originalNow;
  }
});

test("a pending detail response cannot refill a catalogue invalidated during the query", async () => {
  let release, started;
  const received = new Promise((resolve) => {
    started = resolve;
  });
  globalThis.fetch = async () => {
    started();
    await new Promise((resolve) => {
      release = resolve;
    });
    return response({
      id: placeId,
      name: "Ficha anterior",
      type: "library",
      category: "study",
      status: "active",
      images: [],
    });
  };
  const pending = service.getPlaceById(placeId);
  await received;
  service.clearPlacesCache();
  release();
  assert.equal(await pending, null);
  assert.equal(service.getCachedPlaces(), null);
});

test("management includes inactive records, preserves nested details and caches separately from publication", async () => {
  const created = await service.createPlace(input);
  const inactive = { ...database.get(created.id), id: placeId, status: "inactive",
    place_amenities: [{ amenity_key: "wifi", amenity_name: "WiFi", is_available: true }],
    place_spaces: [{ id: "room", name: "Sala conservada", capacity: 4, price_per_hour: 0, billing_unit: "day" }],
  };
  database.set(placeId, inactive);
  database.set("deleted-place", { ...inactive, id: "deleted-place", status: "deleted" });
  database.set("pending-place", { ...inactive, id: "pending-place", status: "pending" });
  const [first, simultaneous] = await Promise.all([service.listManagedPlaces(), service.listManagedPlaces()]);
  assert.equal(first, simultaneous);
  assert.equal(first.length, 2);
  const hidden = first.find((place) => place.id === placeId);
  assert.equal(hidden.status, "inactive");
  assert.equal(hidden.amenities[0].key, "wifi");
  assert.equal(hidden.spaces[0].name, "Sala conservada");
  assert.equal(service.getCachedPlaces(), null);
  assert.equal(await service.listManagedPlaces(), first);
  assert.equal(requests.filter((r) => r.method === "GET" && r.path.endsWith("/places")).length, 1);
  assert.deepEqual((await service.listPlaces()).map((place) => place.id), [created.id]);
  const originalNow = Date.now;
  try {
    Date.now = () => originalNow() + 6 * 60 * 1000;
    assert.equal(service.getManagedPlacesCacheRemaining(), 0);
    await service.listManagedPlaces();
    assert.equal(requests.filter((r) => r.method === "GET" && r.path.endsWith("/places")).length, 2);
  } finally { Date.now = originalNow; }
});

test("disable and enable preserve the record and invalidate management, catalogue and public cards", async () => {
  const created = await service.createPlace(input);
  const publicPlaces = await server.ssrLoadModule("/src/app/services/publicPlaceService.ts");
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (target, options) => {
    const url = new URL(typeof target === "string" ? target : target.url);
    if (url.pathname.endsWith("/rpc/get_public_place_cards"))
      return response([...database.values()].filter((row) => row.status === "active"));
    return previousFetch(target, options);
  };
  await publicPlaces.listPublicPlaces();
  await service.listManagedPlaces();
  await service.listPlaces();
  assert.equal(await service.setManagedPlaceStatus(created.id, "inactive"), "inactive");
  assert.equal(service.getCachedManagedPlaces(), null);
  assert.equal(service.getCachedPlaces(), null);
  assert.equal(publicPlaces.getCachedPublicPlaces(), null);
  assert.deepEqual(await service.listPlaces(), []);
  assert.deepEqual(await publicPlaces.listPublicPlaces(), []);
  assert.equal((await service.listManagedPlaces())[0].status, "inactive");
  assert.equal(await service.setManagedPlaceStatus(created.id, "active"), "active");
  assert.equal((await service.listPlaces())[0].id, created.id);
  assert.equal((await publicPlaces.listPublicPlaces())[0].id, created.id);
  assert.equal(database.get(created.id).description, input.description);
});

test("denied, missing and deleted places never report a confirmed status change", async () => {
  const created = await service.createPlace(input);
  const cached = await service.listManagedPlaces();
  failure = (url, method) => url.pathname.endsWith("/places") && method === "PATCH";
  await assert.rejects(service.setManagedPlaceStatus(created.id, "inactive"));
  assert.equal(database.get(created.id).status, "active");
  assert.equal(service.getCachedManagedPlaces(), cached);
  failure = null;
  await assert.rejects(service.setManagedPlaceStatus(placeId, "active"));
  database.set(placeId, { ...database.get(created.id), id: placeId, status: "deleted" });
  await assert.rejects(service.setManagedPlaceStatus(placeId, "active"));
  assert.equal(database.get(placeId).status, "deleted");
  await assert.rejects(service.setManagedPlaceStatus(created.id, "pending"), /no válido/);
});

test("a stale management response cannot restore data after account changes or a confirmed mutation", async () => {
  let release, started;
  const received = new Promise((resolve) => { started = resolve; });
  globalThis.fetch = async () => {
    started();
    await new Promise((resolve) => { release = resolve; });
    return response([{ id: placeId, name: "Respuesta anterior", status: "active", images: [] }]);
  };
  const pending = service.listManagedPlaces();
  // Register a rejection handler before invalidation to avoid an unhandled promise.
  const rejected = assert.rejects(pending, /sesión o los datos cambiaron/);
  await received;
  service.clearPlacesCache();
  release();
  await rejected;
  assert.equal(service.getCachedManagedPlaces(), null);
});

test("permanent deletion confirms the server result, removes images and clears publication and management caches", async () => {
  const created = await service.createPlace(input);
  await service.listManagedPlaces();
  await service.listPlaces();
  assert.deepEqual(await service.permanentlyDeletePlace(created.id), { imageCleanupPending: false });
  assert.equal(database.has(created.id), false);
  assert.equal(service.getCachedManagedPlaces(), null);
  assert.equal(service.getCachedPlaces(), null);
  const cleanup = requests.find((r) => r.method === "DELETE" && r.path.startsWith("/storage/"));
  assert.deepEqual(cleanup.body.prefixes, [`${created.id}/cover.webp`]);
  assert.ok(!requests.some((r) => r.method === "DELETE" && r.path.endsWith("/places")), "Use the administrator-only RPC for irreversible deletion");
});

test("a denied permanent deletion keeps data, caches and images intact", async () => {
  const created = await service.createPlace(input);
  const cached = await service.listManagedPlaces();
  failure = (url) => url.pathname.endsWith("/rpc/delete_managed_place");
  await assert.rejects(service.permanentlyDeletePlace(created.id));
  assert.equal(database.has(created.id), true);
  assert.equal(service.getCachedManagedPlaces(), cached);
  assert.ok(!requests.some((r) => r.path.startsWith("/storage/") && r.method === "DELETE"));
});

test("image cleanup failure reports the already-confirmed deletion without attempting it twice", async () => {
  const created = await service.createPlace(input);
  failure = (url) => url.pathname.startsWith("/storage/");
  assert.deepEqual(await service.permanentlyDeletePlace(created.id), { imageCleanupPending: true });
  assert.equal(database.has(created.id), false);
  assert.equal(requests.filter((r) => r.path.endsWith("/rpc/delete_managed_place")).length, 1);
});
