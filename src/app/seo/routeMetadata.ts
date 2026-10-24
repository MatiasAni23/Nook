import { getPageSeo, getRobotsDirective, getStructuredData, SITE_NAME, SOCIAL_IMAGE, SOCIAL_IMAGE_ALT } from "./siteSeo";
import { getCachedPublicPlaces } from "../services/publicPlaceService";
import { readPublicPlaceSnapshot, type PublicPlaceCard } from "../services/publicPlaceCatalog";

export function applyRouteMetadata(pathname: string, places: readonly PublicPlaceCard[] = getCachedPublicPlaces() ?? readPublicPlaceSnapshot() ?? []): void {
  const page = getPageSeo(pathname, places);
  const image = page.image ?? SOCIAL_IMAGE, imageAlt = page.imageAlt ?? SOCIAL_IMAGE_ALT;
  document.title = page.title;
  document.documentElement.lang = "es-CL";
  const meta = (name: string, content: string, property = false) => {
    const key = property ? "property" : "name";
    let element = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${name}"]`);
    if (!element) { element = document.createElement("meta"); element.setAttribute(key, name); document.head.appendChild(element); }
    element.content = content;
  };
  meta("description", page.description); meta("robots", getRobotsDirective(page));
  meta("og:title", page.title, true); meta("og:description", page.description, true);
  meta("og:site_name", SITE_NAME, true); meta("og:locale", "es_CL", true);
  meta("og:image", image, true); meta("og:image:secure_url", image, true); meta("og:image:alt", imageAlt, true);
  meta("twitter:title", page.title); meta("twitter:description", page.description); meta("twitter:image", image); meta("twitter:image:alt", imageAlt);
  document.head.querySelectorAll('meta[property="og:image:type"],meta[property="og:image:width"],meta[property="og:image:height"]').forEach(element => element.remove());
  if (!page.image) { meta("og:image:type", "image/jpeg", true); meta("og:image:width", "1200", true); meta("og:image:height", "630", true); }
  document.head.querySelectorAll('link[rel="canonical"],meta[property="og:url"],#pinwi-structured-data').forEach(element => element.remove());
  if (page.canonical) {
    const link = document.createElement("link"); link.rel = "canonical"; link.href = page.canonical; document.head.appendChild(link);
    meta("og:url", page.canonical, true);
  }
  if (page.structuredData) {
    const script = document.createElement("script"); script.id = "pinwi-structured-data"; script.type = "application/ld+json";
    script.textContent = JSON.stringify(page.schema ?? getStructuredData()); document.head.appendChild(script);
  }
}
