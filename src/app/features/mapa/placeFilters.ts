import type { AppPlace } from "../../services/placeService";

type SearchablePlace = Partial<AppPlace> & {
  name: string;
  type: string;
  lat: number;
  lng: number;
  address?: string | null;
  zone?: string | null;
  description?: string | null;
  amenities?: Array<{ key?: string; name?: string; isAvailable?: boolean }>;
};

export function getPlaceTypeLabel(type: string) {
  switch (type) {
    case "library":
      return "Biblioteca";
    case "cafe":
      return "Cafe";
    case "coworking":
      return "Coworking";
    case "park":
      return "Parque";
    case "office":
      return "Oficina";
    case "meeting_room":
      return "Sala de reunion";
    case "private_office":
      return "Oficina privada";
    default:
      return "Lugar";
  }
}

export function placeMatchesTab(place: SearchablePlace, activeTab: string) {
  switch (activeTab) {
    case "cowork":
    case "coworking":
      return place.type === "coworking";
    case "estudios":
      return ["library", "cafe"].includes(place.type);
    case "reuniones":
    case "salas":
      return ["meeting_room", "private_office", "office"].includes(place.type);
    case "parques":
      return place.type === "park";
    case "oficinas":
      return ["office", "private_office"].includes(place.type);
    case "premium":
      return Number.isFinite(place.pricePerHour) && Number(place.pricePerHour) > 0;
    default:
      return true;
  }
}

export function placeMatchesSearch(place: SearchablePlace, searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) return true;

  const amenityText = Array.isArray(place.amenities)
    ? place.amenities
        .filter((amenity) => amenity.isAvailable !== false)
        .map((amenity) => `${amenity.key ?? ""} ${amenity.name ?? ""}`)
    : [];

  const searchableText = [
    place.name,
    place.address,
    place.zone,
    place.description,
    getPlaceTypeLabel(place.type),
    place.wifi ? "wifi internet" : "",
    place.outlets ? "enchufes tomacorriente" : "",
    place.parking ? "parking estacionamiento" : "",
    ...amenityText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedSearch);
}

export function hasValidPlacePrice(place: Partial<AppPlace>) {
  return Number.isFinite(place.pricePerHour) && Number(place.pricePerHour) > 0;
}
