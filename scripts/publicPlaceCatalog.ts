import { PUBLIC_PLACE_PAGE_SIZE, readPublicPlaceCatalog } from "../src/app/services/publicPlaceCatalog";

/** Uses only the anonymous public endpoint, without creating an Auth session. */
export async function loadPublicPlaceCatalog(environment: Record<string, string>, request: typeof fetch = fetch) {
  const url = environment.VITE_SUPABASE_URL;
  const key = environment.VITE_SUPABASE_PUBLISHABLE_KEY || environment.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    return await readPublicPlaceCatalog(async afterId => {
      const response = await request(new URL("/rest/v1/rpc/get_public_place_cards", url), {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ after_id: afterId, page_size: PUBLIC_PLACE_PAGE_SIZE }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error("public_catalog_unavailable");
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== "object" || !["type", "zone", "description"].every(field => field in row))) throw new Error("public_catalog_migration_required");
      return rows;
    });
  } catch {
    throw new Error("No se pudo prerenderizar el catálogo público. Comprueba la conexión y aplica 202610240001_public_place_editorial.sql antes de compilar. No se generará una landing con lugares incompletos.");
  }
}
