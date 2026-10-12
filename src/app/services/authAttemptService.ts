// UX throttling only; security enforcement belongs to Auth and the Edge/database.
const emailRequests = new Map<string, number>();
export class AuthWaitError extends Error {
  constructor(public readonly retryAfter: number) {
    super(`Espera ${retryAfter} segundos antes de solicitar otro correo.`);
  }
}
export async function withEmailCooldown<T>(email: string, operation: () => Promise<T>): Promise<T> {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  for (const [address, expiry] of emailRequests) if (expiry <= now) emailRequests.delete(address);
  const expires = emailRequests.get(key) ?? 0;
  if (expires > now) throw new AuthWaitError(Math.ceil((expires - now) / 1000));
  // Reserve before awaiting: parallel requests cannot bypass the timer.
  emailRequests.set(key, now + 60000);
  return operation();
}
export function clearAuthAttemptState() { emailRequests.clear(); }
export function getEmailCooldownSeconds(email: string) {
  return Math.max(0, Math.ceil(((emailRequests.get(email.trim().toLowerCase()) ?? 0) - Date.now()) / 1000));
}
