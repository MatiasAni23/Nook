import { createServer, type Plugin, type ResolvedConfig } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPageSeo, PUBLIC_PAGES, renderSeoHead, replaceSeoHead, renderRobots, renderSitemap } from "../src/app/seo/siteSeo";

/** Generates static public HTML with the same React views; private routes get an empty shell. */
export function seoPlugin(): Plugin {
  let config: ResolvedConfig;
  const assets = new Map<string, string>();
  return {
    name: "pinwi-public-seo",
    configResolved(resolved) { config = resolved; },
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        const pathname = new URL(context.originalUrl ?? context.path, "http://localhost").pathname;
        return html.replace("<!-- pinwi:seo -->", renderSeoHead(getPageSeo(pathname === "/index.html" ? "/" : pathname)));
      },
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
        if (pathname !== "/robots.txt" && pathname !== "/sitemap.xml") return next();
        response.setHeader("Content-Type", pathname.endsWith(".xml") ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8");
        response.end(pathname.endsWith(".xml") ? renderSitemap() : renderRobots());
      });
    },
    generateBundle(_options, bundle) {
      for (const asset of Object.values(bundle)) if (asset.type === "asset") {
        for (const original of [...asset.originalFileNames, ...asset.names]) assets.set(path.basename(original), "/" + asset.fileName);
      }
    },
    async closeBundle() {
      if (config.command !== "build" || config.build.ssr) return;
      const directory = path.resolve(config.root, config.build.outDir);
      const template = await readFile(path.join(directory, "index.html"), "utf8");
      const server = await createServer({ root: config.root, mode: config.mode, server: { middlewareMode: true, watch: null, hmr: false }, appType: "custom" });
      try {
        const entry = await server.ssrLoadModule("/src/app/seo/prerender.tsx") as { renderPublicPage: (pathname: string) => string };
        for (const page of PUBLIC_PAGES) {
          let content = entry.renderPublicPage(page.path);
          content = content.replace(/file:\/\/\/[^"\s<>]+/g, reference => {
            const sourcePath = fileURLToPath(reference);
            const filename = path.basename(sourcePath);
            const builtAsset = assets.get(filename);
            if (builtAsset) return builtAsset;
            // Vite inlines the small wordmark rather than emitting a separate asset.
            const allowedDirectory = path.resolve(config.root, "assets") + path.sep;
            if (sourcePath.startsWith(allowedDirectory) && path.extname(sourcePath) === ".svg") {
              const svg = readFileSync(sourcePath);
              if (svg.length <= 4096) return "data:image/svg+xml;base64," + svg.toString("base64");
            }
            throw new Error("Missing built public asset: " + filename);
          });
          const html = replaceSeoHead(template, page).replace('<div id="root"></div>', () => `<div id="root">${content}</div>`);
          const filename = page.path === "/" ? "index.html" : page.path.slice(1) + ".html";
          await writeFile(path.join(directory, filename), html);
        }
        await writeFile(path.join(directory, "app-shell.html"), replaceSeoHead(template, getPageSeo("/app")));
        await writeFile(path.join(directory, "robots.txt"), renderRobots());
        await writeFile(path.join(directory, "sitemap.xml"), renderSitemap());
        config.logger.info("SEO: landing y documentos públicos prerenderizados; sitemap, robots y shell privado generados.");
      } finally { await server.close(); }
    },
  };
}
