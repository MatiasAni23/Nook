import { supabase } from "../lib/supabase";

export const socialChannels = [
  { key: "instagram", label: "Instagram" }, { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" }, { key: "linkedin", label: "LinkedIn" },
  { key: "youtube", label: "YouTube" }, { key: "x", label: "X" },
] as const;
export type SocialChannel = typeof socialChannels[number]["key"];
export interface SiteSettings { links: Record<SocialChannel, string>; whatsapp: string; }
export const emptySiteSettings = (): SiteSettings => ({ links: { instagram: "", facebook: "", tiktok: "", linkedin: "", youtube: "", x: "" }, whatsapp: "" });
let demoSettings = emptySiteSettings();
let cache: { value: SiteSettings; time: number } | null = null;
let pending: Promise<SiteSettings> | null = null;
let generation = 0;
const listeners = new Set<() => void>();
const columns = "instagram_url,facebook_url,tiktok_url,linkedin_url,youtube_url,x_url,whatsapp_number";
export const getCachedSiteSettings = () => cache?.value ?? null;
export function subscribeSiteSettings(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function clearSiteSettingsCache() { generation++; cache = null; pending = null; }

export function normalizeSiteSettings(input: SiteSettings): SiteSettings {
  const result = emptySiteSettings();
  for (const { key, label } of socialChannels) {
    const value = input.links[key].trim();
    if (!value) continue;
    let url: URL;
    try { url = new URL(value); } catch { throw new Error(label + ": ingresa un enlace completo que comience con https://."); }
    if (url.protocol !== "https:" || url.username || url.password || /\s/.test(value) || value.length > 2048) throw new Error(label + ": usa un enlace HTTPS válido, sin credenciales.");
    result.links[key] = url.href;
  }
  const phone = input.whatsapp.trim().replace(/[\s().-]/g, "");
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("WhatsApp: incluye el código de país, por ejemplo +56 9 1234 5678.");
  result.whatsapp = phone;
  return result;
}
function fromRow(row: Record<string, unknown>): SiteSettings {
  const settings = emptySiteSettings();
  for (const { key } of socialChannels) settings.links[key] = String(row[key + "_url"] ?? "");
  settings.whatsapp = String(row.whatsapp_number ?? "");
  return normalizeSiteSettings(settings);
}
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!supabase) return demoSettings;
  if (cache && Date.now() - cache.time < 300_000) return cache.value;
  if (pending) return pending;
  const currentGeneration = generation;
  const request = (async () => {
    const { data, error } = await supabase.from("site_settings").select(columns).eq("id", "public").single();
    if (error || !data) throw new Error("No se pudo cargar la configuración del sitio público.");
    const value = fromRow(data);
    if (currentGeneration === generation) cache = { value, time: Date.now() };
    return currentGeneration === generation ? value : cache?.value ?? value;
  })();
  pending = request;
  try { return await request; } finally { if (pending === request) pending = null; }
}
export async function saveSiteSettings(input: SiteSettings): Promise<SiteSettings> {
  const value = normalizeSiteSettings(input);
  let saved = value;
  if (supabase) {
    const fields: Record<string, string> = { whatsapp_number: value.whatsapp };
    for (const { key } of socialChannels) fields[key + "_url"] = value.links[key];
    const { data, error } = await supabase.from("site_settings").update(fields).eq("id", "public").select(columns).single();
    if (error || !data) throw new Error("No se guardaron los enlaces. Verifica que tu cuenta tenga permisos de administrador.");
    saved = fromRow(data);
  } else { demoSettings = value; }
  generation++;
  pending = null;
  cache = { value: saved, time: Date.now() };
  listeners.forEach(listener => listener());
  return saved;
}
