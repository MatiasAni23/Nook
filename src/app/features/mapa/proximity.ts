export type Coordinates = {
  lat: number;
  lng: number;
};

type LocatablePlace = Coordinates;

const EARTH_RADIUS_KM = 6371;

/** Calcula la distancia en línea recta entre dos coordenadas geográficas. */
export function getDistanceInKm(from: Coordinates, to: LocatablePlace) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDifference = toRadians(to.lat - from.lat);
  const longitudeDifference = toRadians(to.lng - from.lng);
  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(longitudeDifference / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Mantiene el orden original hasta contar con una ubicación real del usuario. */
export function sortPlacesByDistance<T extends LocatablePlace>(places: T[], userLocation: Coordinates | null) {
  if (!userLocation) return places;

  return [...places].sort(
    (firstPlace, secondPlace) =>
      getDistanceInKm(userLocation, firstPlace) - getDistanceInKm(userLocation, secondPlace),
  );
}
