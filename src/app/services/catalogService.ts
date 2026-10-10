import { supabase } from "../lib/supabase";
import { createAdminDataCache } from "./adminDataCache";

export interface RegionOption {
  id: string;
  name: string;
  code: string | null;
}

export interface CityOption {
  id: string;
  region_id: string;
  name: string;
}

export interface InstitutionOption {
  id: string;
  city_id: string | null;
  name: string;
  type: string;
}

// Reference data also uses the five-minute, memory-only cache cleared on account changes.
const regionsCache = createAdminDataCache<RegionOption[]>();
const citiesCaches = new Map<string, ReturnType<typeof createAdminDataCache<CityOption[]>>>();
const institutionsCaches = new Map<string, ReturnType<typeof createAdminDataCache<InstitutionOption[]>>>();

export async function getRegions(): Promise<RegionOption[]> {
  if (!supabase) return [];
  return regionsCache.read(fetchRegions);
}

async function fetchRegions(): Promise<RegionOption[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("regions")
    .select("id, name, code")
    .order("name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function getCitiesByRegion(regionId: string): Promise<CityOption[]> {
  if (!supabase || !regionId) return [];
  let cache = citiesCaches.get(regionId);
  if (!cache) {
    cache = createAdminDataCache<CityOption[]>();
    citiesCaches.set(regionId, cache);
  }
  return cache.read(() => fetchCitiesByRegion(regionId));
}

async function fetchCitiesByRegion(regionId: string): Promise<CityOption[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("cities")
    .select("id, region_id, name")
    .eq("region_id", regionId)
    .order("name", { ascending: true });

  if (error) throw error;

  return data ?? [];
}

export async function getInstitutions(cityId?: string): Promise<InstitutionOption[]> {
  if (!supabase) return [];
  const key = cityId ?? "all";
  let cache = institutionsCaches.get(key);
  if (!cache) {
    cache = createAdminDataCache<InstitutionOption[]>();
    institutionsCaches.set(key, cache);
  }
  return cache.read(() => fetchInstitutions(cityId));
}

async function fetchInstitutions(cityId?: string): Promise<InstitutionOption[]> {
  if (!supabase) return [];
  let query = supabase
    .from("institutions")
    .select("id, city_id, name, type")
    .eq("active", true)
    .order("name", { ascending: true });

  if (cityId) {
    query = query.or(`city_id.eq.${cityId},city_id.is.null`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data ?? [];
}
