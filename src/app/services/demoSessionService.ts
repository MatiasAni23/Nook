import type { UserRole } from "./authService";

// Solo se consulta cuando Supabase está desactivado. No acredita una sesión real.
let demoSession: { role: UserRole; name: string } | null = null;
export const getDemoSession = () => demoSession;
export function setDemoSession(role: UserRole, name = "Mi cuenta") { demoSession = { role, name }; }
export function clearDemoSession() { demoSession = null; }
