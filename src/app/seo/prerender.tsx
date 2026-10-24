import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { CurrentUserProvider } from "../context/CurrentUserContext";
import { LandingPage } from "../features/landing/LandingPage";
import { LegalDocumentPage } from "../features/auth/LegalDocumentPage";
import type { PublicPlaceCard } from "../services/publicPlaceCatalog";
import { getPublicPlacePath } from "./siteSeo";
import { PublicCatalogProvider } from "../features/landing/PublicCatalogContext";
import { PublicDirectory, PublicPageFrame, PublicPlaceContent } from "../features/public-places/PublicPlacePage";

/** Build-time rendering only. The caller supplies the minimal public catalogue; effects and Auth never run. */
export function renderPublicPage(path: string, places: PublicPlaceCard[] = []): string {
  const place = places.find(place => getPublicPlacePath(place) === path);
  const page = path === "/" ? <LandingPage onPlaceOpen={() => undefined} /> : path === "/terminos" ? <LegalDocumentPage document="terms" />
    : path === "/privacidad" ? <LegalDocumentPage document="privacy" /> : path === "/lugares" ? <PublicDirectory />
      : place ? <PublicPageFrame><PublicPlaceContent place={place} places={places} /></PublicPageFrame> : null;
  if (!page) throw new Error("Only reviewed public routes can be prerendered");
  return renderToString(<CurrentUserProvider><StaticRouter location={path}><PublicCatalogProvider initialPlaces={places}>{page}</PublicCatalogProvider></StaticRouter></CurrentUserProvider>);
}
