import { useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";
import { applyRouteMetadata } from "../../seo/routeMetadata";
import { LandingPage } from "../landing/LandingPage";
import { PublicCatalogProvider, usePublicCatalog } from "../landing/PublicCatalogContext";
import { readPublicLandingView, rememberPublicLandingView } from "./publicLandingNavigation";
import "./public-places.css";

export interface PublicRouteContext {
  modal: boolean;
  opener: { current: HTMLElement | null };
}

function PublicSiteContents() {
  const location = useLocation();
  const rememberedView = readPublicLandingView(location.key, location.pathname);
  // Only visits made through this document's landing can be restored as a modal.
  // A pasted URL or a reload still renders the complete, independently usable page.
  const enteredThroughHome = useRef(location.pathname === "/" || rememberedView !== null);
  if (location.pathname === "/") enteredThroughHome.current = true;
  const opener = useRef<HTMLElement | null>(null);
  const { places } = usePublicCatalog();
  const modal = enteredThroughHome.current && location.pathname.startsWith("/lugar/") && location.state?.publicPlaceModal === true;
  useLayoutEffect(() => () => {
    if (location.pathname !== "/" && !modal) return;
    const landing = document.querySelector<HTMLElement>(".landing-page");
    const activePage = landing?.querySelector(".landing-carousel-page[aria-hidden=false]");
    if (!landing) return;
    rememberPublicLandingView(location.key, location.pathname, {
      scrollTop: landing.scrollTop,
      carouselPage: activePage?.parentElement ? Array.from(activePage.parentElement.children).indexOf(activePage) : 0,
      openerHref: opener.current?.getAttribute("href") ?? rememberedView?.openerHref ?? null,
    });
  }, [location.key, location.pathname, modal]);
  useEffect(() => { applyRouteMetadata(location.pathname, places ?? []); }, [location.pathname, places]);
  return <>
    {(location.pathname === "/" || modal) && <LandingPage placeModalOpen={modal} initialView={rememberedView} onPlaceOpen={element => { opener.current = element; }} onViewReady={() => {
      if (rememberedView?.openerHref) opener.current = Array.from(document.querySelectorAll<HTMLAnchorElement>(".landing-place-card a")).find(anchor => anchor.getAttribute("href") === rememberedView.openerHref) ?? null;
    }} />}
    <Outlet context={{ modal, opener } satisfies PublicRouteContext} />
  </>;
}

export function PublicSiteLayout() {
  return <PublicCatalogProvider><PublicSiteContents /></PublicCatalogProvider>;
}
