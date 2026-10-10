import type { UserRole } from "../../services/authService";

export function safeAppDestination(value: string | null | undefined) {
  if (!value || !/^\/app(?:\/(?:discover|students|profile(?:\/edit)?|chat(?:\/[^/?#]+)?|(?:place|workplace|checkout)\/[^/?#]+))?$/.test(value)) return "/app/discover";
  return value;
}
export function authLink(destination = "/app/discover", register = false) {
  const query = new URLSearchParams({ continuar: safeAppDestination(destination) });
  if (register) query.set("registro", "1");
  return "/iniciar-sesion?" + query.toString();
}
export function destinationAfterLogin(role: UserRole, requested?: string | null) {
  if (role === "admin") return "/admin";
  if (role === "delegate") return "/delegate";
  return safeAppDestination(requested);
}
export function verificationLink(destination?: string | null, email?: string) {
  const query = new URLSearchParams({ continuar: safeAppDestination(destination) });
  if (email) query.set("email", email);
  return "/verify-account?" + query.toString();
}
