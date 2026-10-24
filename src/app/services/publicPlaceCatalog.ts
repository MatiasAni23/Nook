/** Explicitly authorized public fields. Services, schedules and account data remain private. */
export type PublicPlaceType = "library" | "cafe" | "coworking" | "office" | "meeting_room" | "private_office" | "park";
export interface PublicPlaceCard {
  id: string;
  name: string;
  address: string | null;
  imageUrl: string | null;
  type?: PublicPlaceType | null;
  zone?: string | null;
  description?: string | null;
}

export const PUBLIC_PLACE_PAGE_SIZE = 100;
export const PUBLIC_PLACE_SNAPSHOT_ID = "pinwi-public-places";

export function parsePublicPlaceCards(value: unknown): PublicPlaceCard[] {
  if (!Array.isArray(value)) throw new Error("La respuesta de los lugares no es válida.");
  return value.map((row: unknown) => {
    if (!row || typeof row !== "object") throw new Error("La respuesta de los lugares no es válida.");
    const { id, name, address, image_url, imageUrl, type, zone, description } = row as Record<string, unknown>;
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id) || typeof name !== "string" || !name.trim() || (address != null && typeof address !== "string")) {
      throw new Error("La respuesta de los lugares no es válida.");
    }
    const image = image_url ?? imageUrl;
    if ((type != null && !["library", "cafe", "coworking", "office", "meeting_room", "private_office", "park"].includes(String(type))) ||
        (zone != null && typeof zone !== "string") || (description != null && typeof description !== "string")) {
      throw new Error("La respuesta de los lugares no es válida.");
    }
    let safeImage: string | null = null;
    if (typeof image === "string" && image) {
      try {
        const url = new URL(image);
        if (url.protocol === "https:" && !url.username && !url.password) safeImage = url.href;
      } catch { /* Missing or unsafe images use the neutral placeholder. */ }
    }
    return { id, name: name.trim(), address: typeof address === "string" ? address.trim() || null : null, imageUrl: safeImage,
      type: (type as PublicPlaceType | null | undefined) ?? null, zone: typeof zone === "string" ? zone.trim() || null : null,
      description: typeof description === "string" ? description.trim() || null : null };
  });
}

/** Keyset pagination keeps the public catalogue complete beyond the API row limit. */
export async function readPublicPlaceCatalog(fetchPage: (afterId: string | null) => Promise<unknown>): Promise<PublicPlaceCard[]> {
  const places: PublicPlaceCard[] = [];
  let cursor: string | null = null;
  for (;;) {
    const page = parsePublicPlaceCards(await fetchPage(cursor));
    for (const place of page) {
      if (cursor !== null && place.id <= cursor) throw new Error("No se pudo completar el listado de lugares.");
      places.push(place);
      cursor = place.id;
    }
    if (page.length < PUBLIC_PLACE_PAGE_SIZE) break;
  }
  return places.sort((left, right) => left.name.localeCompare(right.name, "es-CL") || left.id.localeCompare(right.id));
}

export function serializePublicPlaceCards(places: PublicPlaceCard[]): string {
  return JSON.stringify(parsePublicPlaceCards(places)).replace(/[<>&\u2028\u2029]/g, character =>
    "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0"));
}

export function readPublicPlaceSnapshot(): PublicPlaceCard[] | null {
  if (typeof document === "undefined") return null;
  const source = document.getElementById(PUBLIC_PLACE_SNAPSHOT_ID)?.textContent;
  if (!source) return null;
  try { return parsePublicPlaceCards(JSON.parse(source)); } catch { return null; }
}
