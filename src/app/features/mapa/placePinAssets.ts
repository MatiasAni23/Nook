import type { PlaceType } from "../../services/placeService";

const placePinAssets: Record<PlaceType, string> = {
  library: new URL("../../../../assets/Biblioteca.png", import.meta.url).href,
  cafe: new URL("../../../../assets/Cafe.png", import.meta.url).href,
  coworking: new URL("../../../../assets/Coworks.png", import.meta.url).href,
  park: new URL("../../../../assets/Parque.png", import.meta.url).href,
  office: new URL("../../../../assets/Oficinas.png", import.meta.url).href,
  meeting_room: new URL("../../../../assets/sala_de_reuniones.png", import.meta.url).href,
  private_office: new URL("../../../../assets/Oficinas.png", import.meta.url).href,
};

export function getPlacePinAsset(type: string) {
  return placePinAssets[type as PlaceType] ?? placePinAssets.coworking;
}
