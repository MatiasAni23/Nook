export interface PublicLandingView {
  scrollTop: number;
  carouselPage: number;
  openerHref: string | null;
}

// Presentation state only, scoped to this document. A reload or another tab starts clean.
// Never persist an account, credentials, a private return URL or a DOM node here.
const visits = new Map<string, { pathname: string; view: PublicLandingView }>();
const MAX_VISITS = 40;

export function rememberPublicLandingView(key: string, pathname: string, view: PublicLandingView): void {
  if (pathname !== "/" && !pathname.startsWith("/lugar/")) return;
  visits.delete(key);
  visits.set(key, { pathname, view: { scrollTop: Math.max(0, view.scrollTop), carouselPage: Math.max(0, view.carouselPage), openerHref: view.openerHref } });
  if (visits.size > MAX_VISITS) visits.delete(visits.keys().next().value!);
}

export function readPublicLandingView(key: string, pathname: string): PublicLandingView | null {
  const visit = visits.get(key);
  return visit?.pathname === pathname ? { ...visit.view } : null;
}
