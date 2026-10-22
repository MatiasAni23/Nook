import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { PublicPlaceCard } from "../../services/publicPlaceCatalog";

export function PlacePhoto({ place, eager = false }: { place: PublicPlaceCard; eager?: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return place.imageUrl && failedSource !== place.imageUrl ? (
    <img src={place.imageUrl} alt={"Foto principal de " + place.name} width={640} height={440}
      loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailedSource(place.imageUrl)} />
  ) : <span className="landing-photo-placeholder"><ImageOff size={28} strokeWidth={1.3} aria-hidden="true" /><span>Imagen no disponible</span></span>;
}
