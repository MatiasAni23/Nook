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
    requests.push({ path: url.pathname, method, body });
    if (failure?.(url, method))
      return response({ message: "Denied by test policy", code: "42501" }, 403);
    if (url.pathname.startsWith("/storage/v1/object/")) {
      return response(method === "DELETE" ? [] : { Key: url.pathname });
    }
    if (url.pathname.endsWith("/rpc/list_public_places"))
      return response(
        [...database.values()].filter((p) => p.status === "active"),
      );
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
        if (!row)
          return response({ message: "No rows", code: "PGRST116" }, 406);
        database.set(id, { ...row, ...body });
        return response(database.get(id));
      }
      if (method === "DELETE") {
        database.delete(id);
        return response({ id });
      }
      return response(database.get(id) ?? null);
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
    id: created.id,
    name: "Biblioteca editada",
    images: [{ type: "existing", url: "https://example.test/cover.webp" }],
  });
  assert.equal(updated.name, "Biblioteca editada");
  assert.equal(updated.spaces[0].billingUnit, "day");
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
      imageFiles: [new File(["image"], "cover.webp", { type: "image/webp" })],
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
