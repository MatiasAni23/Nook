import type { PublicPlaceCard, PublicPlaceType } from "../services/publicPlaceCatalog";

export const PUBLIC_PLACE_KINDS: Record<PublicPlaceType, { slug: string; label: string; plural: string; intent: string; schemaType: string; advice: string }> = {
  library: { slug: "bibliotecas", label: "Biblioteca", plural: "Bibliotecas", intent: "para estudiar y leer", schemaType: "Library", advice: "Piensa si necesitas leer, preparar una prueba o avanzar en un trabajo. Antes de ir, revisa las condiciones de uso de las salas y las normas de cada biblioteca." },
  coworking: { slug: "coworks", label: "Coworking", plural: "Coworks", intent: "para trabajar", schemaType: "LocalBusiness", advice: "Si trabajas por tu cuenta o buscas un cambio de entorno, empieza por la ubicación. Comprueba la modalidad de acceso y las condiciones del espacio antes de organizar tu jornada." },
  cafe: { slug: "cafes-para-estudiar", label: "Café", plural: "Cafés para estudiar", intent: "para estudiar y trabajar", schemaType: "CafeOrCoffeeShop", advice: "Planifica cuánto tiempo necesitas y comprueba las condiciones del local para estudiar o trabajar. Los servicios y las normas pueden variar entre cafés." },
  office: { slug: "oficinas", label: "Oficina", plural: "Oficinas", intent: "para trabajar", schemaType: "Place", advice: "Define el uso que necesitas darle a la oficina y el tiempo de tu visita. Revisa las condiciones y los detalles del espacio antes de decidir." },
  private_office: { slug: "oficinas-privadas", label: "Oficina privada", plural: "Oficinas privadas", intent: "para trabajar", schemaType: "Place", advice: "Considera el tamaño de tu equipo y la duración de la jornada. Confirma las condiciones de uso antes de elegir una oficina privada." },
  meeting_room: { slug: "salas-de-reunion", label: "Sala de reunión", plural: "Salas de reunión", intent: "para reunirse y trabajar", schemaType: "Place", advice: "Define cuántas personas asistirán y el objetivo de la reunión. Revisa las condiciones de acceso y los detalles de la sala antes de coordinar a tu equipo." },
  park: { slug: "parques", label: "Parque", plural: "Parques", intent: "para leer al aire libre", schemaType: "Park", advice: "Antes de planificar una visita al aire libre, considera el clima y las condiciones del lugar. Consulta los detalles del parque para preparar tu recorrido." },
};

// This exact record stays available while its owner tests it; it is never indexed or recommended.
const UNINDEXED_PLACE_IDS = new Set(["9b701da9-eb76-4c10-b1c2-96dca8d398e5"]);
export const isPublicPlaceIndexable = (place: PublicPlaceCard) => !UNINDEXED_PLACE_IDS.has(place.id);

export function publicSlug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getPlaceKind(place: PublicPlaceCard) {
  return place.type ? PUBLIC_PLACE_KINDS[place.type] : null;
}

export function getPlaceLocality(place: PublicPlaceCard): { name: string; slug: string } | null {
  const zone = place.zone?.trim();
  // The existing "zona o comuna" field also contains ambiguous cross-boundary areas.
  // Keep those labels visible, but do not turn them into invented communes or split their venues.
  if (!zone || zone.includes("/")) return null;
  const alias = publicSlug(zone);
  const name = alias === "santiago-centro" ? "Santiago" : alias === "concepcion-centro" ? "Concepción" : zone;
  const slug = publicSlug(name);
  return slug ? { name, slug } : null;
}

export function getRelatedPublicPlaces(place: PublicPlaceCard, places: readonly PublicPlaceCard[], limit = 4): PublicPlaceCard[] {
  const locality = getPlaceLocality(place)?.slug;
  return places.filter(other => other.id !== place.id && isPublicPlaceIndexable(other)).map(other => ({
    place: other, score: (locality && getPlaceLocality(other)?.slug === locality ? 4 : 0) + (place.type && other.type === place.type ? 2 : 0),
  })).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name, "es-CL") || a.place.id.localeCompare(b.place.id))
    .slice(0, Math.max(0, limit)).map(item => item.place);
}

export interface PublicCollection {
  path: string;
  title: string;
  description: string;
  kind: PublicPlaceType | null;
  locality: { name: string; slug: string } | null;
  places: PublicPlaceCard[];
  introduction: string;
  advice: string;
}

export function getPublicCollections(places: readonly PublicPlaceCard[]): PublicCollection[] {
  const active = places.filter(isPublicPlaceIndexable);
  const localities = new Map<string, { name: string; slug: string }>();
  for (const place of active) { const locality = getPlaceLocality(place); if (locality) localities.set(locality.slug, locality); }
  const collections: PublicCollection[] = [];
  const add = (kind: PublicPlaceType | null, locality: { name: string; slug: string } | null, members: PublicPlaceCard[]) => {
    // Avoid creating many near-identical area pages for a single venue.
    if (members.length < (locality ? 2 : 1)) return;
    const info = kind ? PUBLIC_PLACE_KINDS[kind] : null;
    const title = `${info?.plural ?? "Lugares para estudiar y trabajar"}${locality ? " en " + locality.name : " en Chile"}`;
    collections.push({
      path: "/" + (info?.slug ?? "lugares") + (locality ? "/" + locality.slug : ""), title, kind, locality, places: members,
      description: `${title}. Explora fotos, direcciones y descripciones de espacios reales para preparar tu próxima jornada.`,
      introduction: `Explora ${info ? info.plural.toLocaleLowerCase("es-CL") : "bibliotecas y espacios de trabajo"}${locality ? " en " + locality.name : " en distintas zonas de Chile"}. Aquí puedes consultar qué es cada lugar, dónde está y cómo se presenta, con la descripción y la foto principal de su ficha.`,
      advice: info?.advice ?? "Compara el tipo de espacio y su ubicación según lo que quieras hacer. En cada ficha encontrarás su dirección y una descripción para orientar tu elección antes de consultar los demás detalles.",
    });
  };
  for (const kind of Object.keys(PUBLIC_PLACE_KINDS) as PublicPlaceType[]) {
    const members = active.filter(place => place.type === kind);
    if (!members.length) continue;
    add(kind, null, members);
    for (const locality of localities.values()) add(kind, locality, members.filter(place => getPlaceLocality(place)?.slug === locality.slug));
  }
  for (const locality of localities.values()) add(null, locality, active.filter(place => getPlaceLocality(place)?.slug === locality.slug));
  return collections.sort((a, b) => a.path.localeCompare(b.path));
}

export function getPublicPlaceDescription(place: PublicPlaceCard): string | null {
  return place.description?.trim() || null;
}
