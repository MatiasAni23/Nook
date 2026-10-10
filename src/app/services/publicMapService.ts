import { supabase } from "../lib/supabase";
import { demoPlaces } from "../data/demoPlaces";
import type { PlaceCategory, PlaceType } from "./placeService";

export interface PublicMapPin { id: string; name: string; type: PlaceType; category: PlaceCategory; lat: number; lng: number; }
let snapshot: { pins: PublicMapPin[]; time: number } | null = null;
let pending: Promise<PublicMapPin[]> | null = null;
let generation = 0;
export const getCachedPublicPins = () => snapshot?.pins ?? null;
export function clearPublicMapCache() { generation++; snapshot = null; pending = null; }

export async function listPublicMapPins(): Promise<PublicMapPin[]> {
  if (!supabase) return demoPlaces.map(({ id, name, type, category, lat, lng }) => ({ id, name, type, category, lat, lng }));
  if (snapshot && Date.now() - snapshot.time < 300_000) return snapshot.pins;
  if (pending) return pending;
  const currentGeneration = generation;
  const request = (async () => {
    const { data, error } = await supabase.rpc("get_public_map_pins");
    if (error) throw new Error("No se pudieron cargar los lugares del mapa. Intenta de nuevo más tarde.");
    if (!Array.isArray(data)) throw new Error("La respuesta del mapa no es válida.");
    const pins = data.map((row: Record<string, unknown>): PublicMapPin => {
      const lat = Number(row.latitude), lng = Number(row.longitude);
      if (typeof row.id !== "string" || typeof row.name !== "string" || !["library", "cafe", "coworking", "office", "meeting_room", "private_office", "park"].includes(String(row.type)) || !["study", "work"].includes(String(row.category)) || row.latitude == null || row.longitude == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error("La respuesta del mapa no es válida.");
      return { id: row.id, name: row.name, type: row.type as PlaceType, category: row.category as PlaceCategory, lat, lng };
    });
    if (generation === currentGeneration) snapshot = { pins, time: Date.now() };
    return pins;
  })();
  pending = request;
  try { return await request; } finally { if (pending === request) pending = null; }
}
