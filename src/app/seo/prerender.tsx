import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { CurrentUserProvider } from "../context/CurrentUserContext";
import { LandingPage } from "../features/landing/LandingPage";
import { LegalDocumentPage } from "../features/auth/LegalDocumentPage";
import type { PublicPlaceCard } from "../services/publicPlaceCatalog";

/** Build-time rendering only. The caller supplies the minimal public catalogue; effects and Auth never run. */
export function renderPublicPage(path: string, places: PublicPlaceCard[] = []): string {
  const page = path === "/" ? <LandingPage initialPlaces={places} /> : path === "/terminos" ? <LegalDocumentPage document="terms" />
    : path === "/privacidad" ? <LegalDocumentPage document="privacy" /> : null;
  if (!page) throw new Error("Only reviewed public routes can be prerendered");
  return renderToString(<CurrentUserProvider><StaticRouter location={path}>{page}</StaticRouter></CurrentUserProvider>);
}
