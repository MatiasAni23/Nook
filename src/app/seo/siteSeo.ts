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
}

// Only reviewed public pages belong here. Legal drafts remain accessible, but unindexed.
export const PUBLIC_PAGES: readonly PageSeo[] = [
  {
    path: "/", title: "Pinwi | Espacios para estudiar y trabajar en Chile",
    description: "Descubre bibliotecas, cafés y coworking en Chile. Explora el mapa público de Pinwi y crea tu cuenta para conocer los espacios y guardar tus favoritos.",
    indexable: true, canonical: SITE_ORIGIN + "/", structuredData: true,
  },
  {
    path: "/terminos", title: "Términos y condiciones | Pinwi",
    description: "Consulta el borrador de los términos de Pinwi, su estado de preparación y las condiciones relacionadas con el uso de la aplicación.",
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

export function getPageSeo(pathname: string): PageSeo {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const publicPage = PUBLIC_PAGES.find(page => page.path === path);
  if (publicPage) return publicPage;
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
  return [
    SEO_START,
    `<title>${escapeHtml(page.title)}</title>`,
    meta("description", page.description), meta("robots", getRobotsDirective(page)),
    ...(page.canonical ? [`<link rel="canonical" href="${escapeHtml(page.canonical)}">`] : []),
    meta("og:type", "website", true), meta("og:site_name", SITE_NAME, true), meta("og:locale", "es_CL", true),
    ...(page.canonical ? [meta("og:url", page.canonical, true)] : []),
    meta("og:title", page.title, true), meta("og:description", page.description, true),
    meta("og:image", SOCIAL_IMAGE, true), meta("og:image:secure_url", SOCIAL_IMAGE, true),
    meta("og:image:type", "image/jpeg", true), meta("og:image:width", "1200", true), meta("og:image:height", "630", true), meta("og:image:alt", SOCIAL_IMAGE_ALT, true),
    meta("twitter:card", "summary_large_image"), meta("twitter:title", page.title), meta("twitter:description", page.description), meta("twitter:image", SOCIAL_IMAGE), meta("twitter:image:alt", SOCIAL_IMAGE_ALT),
    ...(page.structuredData ? [`<script id="pinwi-structured-data" type="application/ld+json">${JSON.stringify(getStructuredData()).replace(/</g, "\\u003c")}</script>`] : []),
    SEO_END,
  ].join("\n");
}

export function replaceSeoHead(html: string, page: PageSeo): string {
  const start = html.indexOf(SEO_START), end = html.indexOf(SEO_END);
  if (start < 0 || end < start) throw new Error("SEO metadata boundaries missing");
  return html.slice(0, start) + renderSeoHead(page) + html.slice(end + SEO_END.length);
}

export function renderSitemap(): string {
  const entries = PUBLIC_PAGES.filter(page => page.indexable).map(page => {
    if (!page.canonical || !page.canonical.startsWith(SITE_ORIGIN + "/")) throw new Error("Invalid sitemap canonical");
    return `  <url><loc>${escapeHtml(page.canonical)}</loc>${page.lastModified ? `<lastmod>${escapeHtml(page.lastModified)}</lastmod>` : ""}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;
}

export function renderRobots(): string {
  // Private HTML remains crawlable so crawlers can read noindex. Auth/RLS protect data.
  return `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}
