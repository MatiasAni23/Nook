import { supabase } from "../lib/supabase";
import { demoPlaces } from "../data/demoPlaces";
import { PUBLIC_PLACE_PAGE_SIZE, readPublicPlaceCatalog, type PublicPlaceCard } from "./publicPlaceCatalog";

export type { PublicPlaceCard } from "./publicPlaceCatalog";
let snapshot: { places: PublicPlaceCard[]; time: number } | null = null;
let pending: Promise<PublicPlaceCard[]> | null = null;
let generation = 0;

export const getCachedPublicPlaces = () => snapshot?.places ?? null;
export function clearPublicPlaceCache() { generation++; snapshot = null; pending = null; }

export async function listPublicPlaces(): Promise<PublicPlaceCard[]> {
  if (!supabase) return demoPlaces.map(({ id, name }) => ({ id, name, imageUrl: null }));
  const client = supabase;
  if (snapshot && Date.now() - snapshot.time < 300_000) return snapshot.places;
  if (pending) return pending;
  const currentGeneration = generation;
  const request = readPublicPlaceCatalog(async afterId => {
    const { data, error } = await client.rpc("get_public_place_cards", { after_id: afterId, page_size: PUBLIC_PLACE_PAGE_SIZE });
    if (error) throw new Error("No pudimos cargar los lugares. Intenta nuevamente.");
    return data;
  }).then(places => {
    if (generation === currentGeneration) snapshot = { places, time: Date.now() };
    return places;
  });
  pending = request;
  try { return await request; } finally { if (pending === request) pending = null; }
}
