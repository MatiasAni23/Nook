import { supabase } from "../lib/supabase";

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

export async function getRegions(): Promise<RegionOption[]> {
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
