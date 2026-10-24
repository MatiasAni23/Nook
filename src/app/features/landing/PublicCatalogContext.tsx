import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCachedPublicPlaces, listPublicPlaces } from "../../services/publicPlaceService";
import { readPublicPlaceSnapshot, type PublicPlaceCard } from "../../services/publicPlaceCatalog";

interface PublicCatalog {
  places: PublicPlaceCard[] | null;
  loading: boolean;
  error: string;
  retry: () => void;
}

const CatalogContext = createContext<PublicCatalog | null>(null);

/** One minimal catalogue for the landing, route previews and public directory. */
export function PublicCatalogProvider({ initialPlaces, children }: { initialPlaces?: PublicPlaceCard[]; children: ReactNode }) {
  const [places, setPlaces] = useState<PublicPlaceCard[] | null>(() => initialPlaces ?? getCachedPublicPlaces() ?? readPublicPlaceSnapshot());
  const [loading, setLoading] = useState(places === null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    setError("");
    listPublicPlaces().then(value => { if (mounted) setPlaces(value); })
      .catch(() => { if (mounted) setError("No pudimos actualizar los lugares. Intenta nuevamente."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [attempt]);
  return <CatalogContext.Provider value={{ places, loading, error, retry: () => { setLoading(places === null); setAttempt(value => value + 1); } }}>{children}</CatalogContext.Provider>;
}

export function usePublicCatalog(): PublicCatalog {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("Public catalogue provider is missing");
  return catalog;
}
