import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { CurrentUserProvider } from "../context/CurrentUserContext";
import { LandingPage } from "../features/landing/LandingPage";
import { LegalDocumentPage } from "../features/auth/LegalDocumentPage";

/** Build-time rendering only. Effects, Auth requests and the interactive map never run. */
export function renderPublicPage(path: string): string {
  const page = path === "/" ? <LandingPage /> : path === "/terminos" ? <LegalDocumentPage document="terms" />
    : path === "/privacidad" ? <LegalDocumentPage document="privacy" /> : null;
  if (!page) throw new Error("Only reviewed public routes can be prerendered");
  return renderToString(<CurrentUserProvider><StaticRouter location={path}>{page}</StaticRouter></CurrentUserProvider>);
}
