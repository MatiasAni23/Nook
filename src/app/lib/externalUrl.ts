export function getSafeWebsiteUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || /[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.pathname === "/" && !url.search && !url.hash ? url.origin : url.href;
  } catch { return null; }
}

export function validateWebsiteUrl(value: string | null | undefined) {
  if (!value?.trim()) return null;
  const safe = getSafeWebsiteUrl(value);
  if (!safe) throw new Error("Ingresa una URL válida con http o https, sin credenciales.");
  return safe;
}
