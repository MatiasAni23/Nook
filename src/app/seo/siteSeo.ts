import type { PublicPlaceCard } from "../services/publicPlaceCatalog";
import { getPlaceKind, getPlaceLocality, getPublicCollections, getPublicPlaceDescription, isPublicPlaceIndexable, type PublicCollection } from "./publicPlaceDiscovery";

export const SITE_ORIGIN = "https://www.pinwi.cl";
export const SITE_NAME = "Pinwi";
export const SOCIAL_IMAGE = SITE_ORIGIN + "/social/pinwi-preview-v1.jpg";
export const SOCIAL_IMAGE_ALT = "Pinwi: encuentra tu lugar para estudiar y trabajar, junto a una imagen ilustrativa de una biblioteca con luz natural.";

export interface PageSeo {
  path: string;
  title: string;
  description: string;
  indexable: boolean;
  canonical?: string;
  structuredData?: boolean;
  lastModified?: string;
  image?: string;
  imageAlt?: string;
  schema?: Record<string, unknown>;
}

// Only reviewed public pages belong here. Legal documents remain accessible, but unindexed.
export const PUBLIC_PAGES: readonly PageSeo[] = [
  {
    path: "/", title: "Pinwi | Espacios para estudiar y trabajar en Chile",
    description: "Descubre bibliotecas, cafés para estudiar y coworking en Chile. Explora fotos, direcciones y descripciones para encontrar tu próximo espacio.",
    indexable: true, canonical: SITE_ORIGIN + "/", structuredData: true,
  },
  {
    path: "/lugares", title: "Bibliotecas, cafés para estudiar y coworking en Chile | Pinwi",
    description: "Explora bibliotecas y lugares para estudiar y trabajar en Chile por tipo y comuna. Compara fotos, direcciones y descripciones para preparar tu próxima jornada.",
    indexable: true, canonical: SITE_ORIGIN + "/lugares", structuredData: true,
  },
  {
    path: "/terminos", title: "Términos y condiciones | Pinwi",
    description: "Conoce los términos y condiciones de Pinwi: uso de cuentas, espacios, solicitudes de reserva, responsabilidades y canales de contacto.",
    indexable: false, canonical: SITE_ORIGIN + "/terminos",
  },
  {
    path: "/privacidad", title: "Política de privacidad | Pinwi",
    description: "Consulta el borrador de privacidad de Pinwi, la información sobre sus funciones y los puntos pendientes antes de su publicación definitiva.",
    indexable: false, canonical: SITE_ORIGIN + "/privacidad",
  },
];

const authTitles: Record<string, string> = {
  "/iniciar-sesion": "Iniciar sesión o crear cuenta | Pinwi",
  "/recover-password": "Recuperar contraseña | Pinwi",
  "/verify-account": "Verificar correo | Pinwi",
  "/delegate-invite": "Invitación de delegado | Pinwi",
};

/** The immutable ID prevents collisions between venues with the same name. */
export function getPublicPlacePath(place: PublicPlaceCard): string {
  const slug = place.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").slice(0, 90).replace(/^-|-$/g, "") || "espacio";
  return "/lugar/" + slug + "-" + place.id;
}

export function getPublicPages(places: readonly PublicPlaceCard[] = []): PageSeo[] {
  return [...PUBLIC_PAGES, ...places.map(getPublicPlaceSeo), ...getPublicCollections(places).map(getPublicCollectionSeo)];
}

export function getPublicPlaceSeo(place: PublicPlaceCard): PageSeo {
  const path = getPublicPlacePath(place), canonical = SITE_ORIGIN + path;
  const kind = getPlaceKind(place), locality = getPlaceLocality(place);
  const location = locality?.name ?? place.zone;
  const summary = getPublicPlaceDescription(place)?.replace(/\s+/g, " ");
  const text = `${place.name}${location ? " en " + location : ""}. ${summary ?? "Explora su ubicación y su foto para preparar tu próxima jornada de estudio o trabajo."}`;
  const description = text.length > 165 ? text.slice(0, 162).replace(/\s+\S*$/, "") + "…" : text;
  return {
    path, canonical, title: `${place.name}${location ? " en " + location : ""}: ${kind?.intent ?? "para estudiar y trabajar"} | Pinwi`, description, indexable: isPublicPlaceIndexable(place), structuredData: true,
    ...(place.imageUrl ? { image: place.imageUrl, imageAlt: "Foto principal de " + place.name } : {}),
    schema: {
      "@context": "https://schema.org", "@graph": [
        ...getStructuredData()["@graph"],
        { "@type": "WebPage", "@id": canonical, url: canonical, name: place.name, description, inLanguage: "es-CL", isPartOf: { "@id": SITE_ORIGIN + "/#website" }, mainEntity: { "@id": canonical + "#place" }, breadcrumb: { "@id": canonical + "#breadcrumbs" } },
        { "@type": kind?.schemaType ?? "Place", "@id": canonical + "#place", name: place.name, url: canonical,
          ...(place.address ? { address: { "@type": "PostalAddress", streetAddress: place.address, ...(locality ? { addressLocality: locality.name } : {}), addressCountry: "CL" } } : {}),
          ...(summary ? { description: summary } : {}), ...(place.imageUrl ? { image: place.imageUrl } : {}) },
        { "@type": "BreadcrumbList", "@id": canonical + "#breadcrumbs", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_ORIGIN + "/" },
          { "@type": "ListItem", position: 2, name: "Lugares", item: SITE_ORIGIN + "/lugares" },
          { "@type": "ListItem", position: 3, name: place.name, item: canonical },
        ] },
      ],
    },
  };
}

export function getPublicCollectionSeo(collection: PublicCollection): PageSeo {
  const canonical = SITE_ORIGIN + collection.path;
  return { path: collection.path, canonical, title: collection.title + " | Pinwi", description: collection.description, indexable: true, structuredData: true,
    schema: { "@context": "https://schema.org", "@graph": [
      ...getStructuredData()["@graph"],
      { "@type": "CollectionPage", "@id": canonical, url: canonical, name: collection.title, description: collection.description, inLanguage: "es-CL", mainEntity: { "@id": canonical + "#places" }, breadcrumb: { "@id": canonical + "#breadcrumbs" } },
      { "@type": "ItemList", "@id": canonical + "#places", itemListElement: collection.places.map((place, index) => ({ "@type": "ListItem", position: index + 1, name: place.name, url: SITE_ORIGIN + getPublicPlacePath(place) })) },
      { "@type": "BreadcrumbList", "@id": canonical + "#breadcrumbs", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_ORIGIN + "/" },
        { "@type": "ListItem", position: 2, name: "Lugares", item: SITE_ORIGIN + "/lugares" },
        { "@type": "ListItem", position: 3, name: collection.title, item: canonical },
      ] },
    ] },
  };
}

export function getPageSeo(pathname: string, places: readonly PublicPlaceCard[] = []): PageSeo {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const publicPage = PUBLIC_PAGES.find(page => page.path === path);
  if (publicPage) return publicPage;
  if (path.startsWith("/lugar/")) {
    const place = places.find(place => getPublicPlacePath(place) === path);
    if (place) return getPublicPlaceSeo(place);
  }
  const collection = getPublicCollections(places).find(collection => collection.path === path);
  if (collection) return getPublicCollectionSeo(collection);
  const prefix = path.split("/")[1];
  const title = authTitles[path] ?? (prefix === "admin" ? "Administración | Pinwi"
    : prefix === "delegate" ? "Panel de delegado | Pinwi"
      : prefix === "app" ? "Mi espacio | Pinwi" : "Página no encontrada | Pinwi");
  // Never include a user, invitation token, query string or private record in metadata.
  return { path, title, description: "Accede a tu cuenta de Pinwi para continuar.", indexable: false };
}

export function getStructuredData() {
  return {
    "@context": "https://schema.org", "@graph": [
      { "@type": "Organization", "@id": SITE_ORIGIN + "/#organization", name: SITE_NAME, url: SITE_ORIGIN + "/", logo: SITE_ORIGIN + "/brand/pinwi-logo.png" },
      { "@type": "WebSite", "@id": SITE_ORIGIN + "/#website", name: SITE_NAME, url: SITE_ORIGIN + "/", inLanguage: "es-CL", publisher: { "@id": SITE_ORIGIN + "/#organization" } },
    ],
  };
}

export function getRobotsDirective(page: PageSeo): string {
  return page.indexable ? "index, follow, max-image-preview:large" : page.canonical ? "noindex, follow" : "noindex, nofollow";
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const SEO_START = "<!-- pinwi:seo:start -->";
export const SEO_END = "<!-- pinwi:seo:end -->";
export function renderSeoHead(page: PageSeo): string {
  const meta = (name: string, content: string, property = false) => `<meta ${property ? "property" : "name"}="${name}" content="${escapeHtml(content)}">`;
  const image = page.image ?? SOCIAL_IMAGE, imageAlt = page.imageAlt ?? SOCIAL_IMAGE_ALT;
  return [
    SEO_START,
    `<title>${escapeHtml(page.title)}</title>`,
    meta("description", page.description), meta("robots", getRobotsDirective(page)),
    ...(page.canonical ? [`<link rel="canonical" href="${escapeHtml(page.canonical)}">`] : []),
    meta("og:type", "website", true), meta("og:site_name", SITE_NAME, true), meta("og:locale", "es_CL", true),
    ...(page.canonical ? [meta("og:url", page.canonical, true)] : []),
    meta("og:title", page.title, true), meta("og:description", page.description, true),
    meta("og:image", image, true), meta("og:image:secure_url", image, true),
    ...(!page.image ? [meta("og:image:type", "image/jpeg", true), meta("og:image:width", "1200", true), meta("og:image:height", "630", true)] : []), meta("og:image:alt", imageAlt, true),
    meta("twitter:card", "summary_large_image"), meta("twitter:title", page.title), meta("twitter:description", page.description), meta("twitter:image", image), meta("twitter:image:alt", imageAlt),
    ...(page.structuredData ? [`<script id="pinwi-structured-data" type="application/ld+json">${JSON.stringify(page.schema ?? getStructuredData()).replace(/</g, "\\u003c")}</script>`] : []),
    SEO_END,
  ].join("\n");
}

export function replaceSeoHead(html: string, page: PageSeo): string {
  const start = html.indexOf(SEO_START), end = html.indexOf(SEO_END);
  if (start < 0 || end < start) throw new Error("SEO metadata boundaries missing");
  return html.slice(0, start) + renderSeoHead(page) + html.slice(end + SEO_END.length);
}

export function renderSitemap(places: readonly PublicPlaceCard[] = []): string {
  const entries = getPublicPages(places).filter(page => page.indexable).map(page => {
    if (!page.canonical || !page.canonical.startsWith(SITE_ORIGIN + "/")) throw new Error("Invalid sitemap canonical");
    return `  <url><loc>${escapeHtml(page.canonical)}</loc>${page.lastModified ? `<lastmod>${escapeHtml(page.lastModified)}</lastmod>` : ""}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

export function renderRobots(): string {
  // Private HTML remains crawlable so crawlers can read noindex. Auth/RLS protect data.
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}
