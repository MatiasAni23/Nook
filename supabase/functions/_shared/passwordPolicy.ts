// Pure policy shared by the browser and Edge Functions. Never trim a password.
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const RECOVERY_CODE_TTL_SECONDS = 600;

export function getPasswordValidationMessage(password: string): string {
  const length = Array.from(password).length;
  if (length < MIN_PASSWORD_LENGTH) return "La contraseña debe tener al menos 8 caracteres.";
  if (length > MAX_PASSWORD_LENGTH) return "La contraseña no puede superar los 128 caracteres.";
  if (/\p{Cc}/u.test(password)) return "La contraseña no puede contener caracteres de control.";
  if (password.trim().length === 0 || /^(.{1,4})\1+$/u.test(password)) return "Evita contraseñas formadas por un patrón repetido.";
  return "";
}

// Guidance, not an entropy estimate or a guarantee against leaked passwords.
export function getPasswordStrength(password: string) {
  if (!password) return { label: "Sin datos", color: "bg-slate-300", width: "0%" };
  if (getPasswordValidationMessage(password)) return { label: "No cumple los requisitos", color: "bg-red-500", width: "25%" };
  if (Array.from(password).length < 20) return { label: "Cumple la longitud mínima", color: "bg-blue-500", width: "65%" };
  return { label: "Frase o contraseña larga", color: "bg-green-500", width: "100%" };
}
