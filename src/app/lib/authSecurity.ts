import { isSupabaseConfigured } from "./supabase";
export const isAuthCaptchaEnabled = isSupabaseConfigured && Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);
export function requireCaptcha(token?: string) {
  if (isAuthCaptchaEnabled && !token) throw new Error("Completa la verificación de seguridad antes de continuar.");
}
export function normalizeAuthEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error("Ingresa un correo válido.");
  return value;
}
export function normalizeAuthCode(code: string) {
  const value = code.replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(value)) throw new Error("Ingresa el código completo, usando solo números.");
  return value;
}
