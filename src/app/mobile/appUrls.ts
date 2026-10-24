import { Capacitor } from '@capacitor/core';

export const PUBLIC_APP_ORIGIN = 'https://www.pinwi.cl';

// Email OTP flows keep working without adding an unregistered callback to Auth.
// Shareable invitations must always point to the public site, never localhost.
export function getWebAppUrl(path: string): string {
  const origin = Capacitor.isNativePlatform() ? PUBLIC_APP_ORIGIN : window.location.origin;
  return new URL(path, origin).href;
}

export function getNativeLinkDestination(value: string): string | null {
  try {
    const url = new URL(value);
    const custom = url.protocol === 'cl.pinwi.app:' && url.hostname === 'open';
    if ((!custom && url.origin !== PUBLIC_APP_ORIGIN) || url.username || url.password) return null;
    // Links navigate only. Never import sessions/tokens from arbitrary incoming URLs.
    if (url.hash || ['access_token', 'refresh_token', 'token_hash', 'code'].some(key => url.searchParams.has(key))) return null;
    if (!/^\/(?:verify-account|recover-password|delegate-invite|iniciar-sesion|app(?:\/[^?#]*)?)$/.test(url.pathname)) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}
