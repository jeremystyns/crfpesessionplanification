import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

// Standalone static pages under public/<slug>/index.html (e.g. /enterprise) are
// served correctly by Apache's directory-index rewrite in production, but Vite's
// dev server has no such resolution and falls through to the SPA's index.html.
// This rewrites the request before Vite's own middlewares run so `bun dev`
// matches production behavior for these pages.
const STANDALONE_STATIC_PAGES = ["enterprise", "en/enterprise"];

function standaloneStaticPages(): Plugin {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    const url = req.url?.split("?")[0];
    const match = STANDALONE_STATIC_PAGES.find((slug) => url === `/${slug}` || url === `/${slug}/`);
    if (match) req.url = `/${match}/index.html`;
    next();
  };
  return {
    name: "standalone-static-pages",
    // Dev server (`bun dev` / `vite`)
    configureServer(server) {
      server.middlewares.use(rewrite);
    },
    // `vite preview` — serves the built dist/ folder, uses a separate hook
    configurePreviewServer(server) {
      server.middlewares.use(rewrite);
    },
  };
}

let appBuild = 0;
try {
  const raw = fs.readFileSync(path.resolve(__dirname, "src/build-info.json"), "utf-8");
  appBuild = JSON.parse(raw).build ?? 0;
} catch { /* build-info.json not available (dev mode) */ }

// Mirror the backend/ PHP runtime into dist/ right after the bundle is
// written. The script is dynamically imported: vite.config.ts is also
// consumed by the public-export build (config/public-export/manifest.json
// copies it) and the public export has no backend/manifest.json nor the
// scripts/ directory. A static import would break the public build.
function backendMirrorPlugin(): Plugin {
  return {
    name: "sessionplan-backend-mirror",
    apply: "build",
    async closeBundle() {
      const repoRoot = __dirname;
      if (!fs.existsSync(path.join(repoRoot, "backend/manifest.json"))) return;
      const script = path.join(repoRoot, "scripts/assemble-backend.mjs");
      if (!fs.existsSync(script)) {
        // A public build has no backend/manifest.json and returns above; a
        // private build with a manifest but without the assembly script would
        // otherwise produce a PHP-less dist/ with exit 0.
        throw new Error("backend/manifest.json exists but scripts/assemble-backend.mjs is missing; cannot mirror the PHP backend.");
      }
      const { runBackendAssembleFor } = await import(
        pathToFileURL(script).href
      );
      runBackendAssembleFor(repoRoot);
    },
  };
}


// ── Build « fichier unique » (`npm run build:standalone`) ─────────────────────
// Produit dist-standalone/session-planification.html (+ une version « fragment »
// pour les artefacts Claude) : JS, CSS, polices, sons et textes embarqués, sans
// service worker ni appel réseau. Le fichier s'ouvre hors ligne, tel quel.
const VIRTUAL_ASSETS = "virtual:standalone-assets";
const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml",
};

function standaloneAssetsPlugin(enabled: boolean): Plugin {
  const dataUri = (file: string) =>
    `data:${MIME[path.extname(file)]};base64,${fs.readFileSync(file).toString("base64")}`;
  return {
    name: "standalone-assets",
    resolveId: (id) => (id === VIRTUAL_ASSETS ? `\0${VIRTUAL_ASSETS}` : null),
    load(id) {
      if (id !== `\0${VIRTUAL_ASSETS}`) return null;
      const assets: Record<string, string> = {};
      const files: Record<string, string> = {};
      if (enabled) {
        const pub = path.resolve(__dirname, "public");
        const addAssets = (dir: string, accept: RegExp) => {
          for (const name of fs.readdirSync(path.join(pub, dir))) {
            if (accept.test(name)) assets[`/${dir}/${name}`] = dataUri(path.join(pub, dir, name));
          }
        };
        addAssets("assets", /\.(mp3|webp)$|^crfpe-logo-256\.png$/);
        for (const name of ["favicon.svg", "crfpe-logo.svg", "icon-192.png"]) {
          assets[`/pwa/${name}`] = dataUri(path.join(pub, "pwa", name));
        }
        const addText = (rel: string) => { files[`/${rel}`] = fs.readFileSync(path.join(pub, rel), "utf-8"); };
        ["locales/fr/common.json", "locales/en/common.json", "data/defaultLibrary.json",
          "data/defaultLibrary.en.json", "data/landing/home.json", "data/landing/en/home.json"].forEach(addText);
      }
      return `export const standaloneAssets = ${JSON.stringify(assets)};\nexport const standaloneFiles = ${JSON.stringify(files)};`;
    },
    transformIndexHtml: {
      order: "pre",
      handler: (html) =>
        enabled
          ? html
              .replace(/<link rel="(?:icon|apple-touch-icon)"[^>]*>\s*/g, "")
              .replace("/src/main.tsx", "/src/main.standalone.tsx")
          : html,
    },
  };
}

function singleFilePlugin(): Plugin {
  const safeScript = (code: string) => code.replace(/<\/(script)/gi, "<\\/$1");
  return {
    name: "single-file",
    enforce: "post",
    generateBundle: { order: "post", handler(_options, bundle) {
      const htmlName = Object.keys(bundle).find((f) => f.endsWith(".html"));
      if (!htmlName) return;
      const htmlAsset = bundle[htmlName] as { source: string };
      let html = String(htmlAsset.source);
      let js = "";
      let css = "";
      for (const [name, item] of Object.entries(bundle)) {
        if (item.type === "chunk" && item.isEntry) { js += item.code; delete bundle[name]; }
        else if (item.type === "asset" && name.endsWith(".css")) { css += String(item.source); delete bundle[name]; }
      }
      const themeInit = html.match(/<script>[\s\S]*?<\/script>/)?.[0] ?? "";
      const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? "<title>Session planification</title>";
      const body = `<div id="root"></div>\n${themeInit}\n<script type="module">${safeScript(js)}</script>`;
      const lang = html.match(/<html[^>]*lang="(\w+)"/)?.[1] ?? "fr";
      // Fichier complet : s'ouvre tel quel dans un navigateur ou une application bureau.
      this.emitFile({
        type: "asset",
        fileName: "session-planification.html",
        source: `<!doctype html>\n<html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${title}<style>${css}</style></head><body>${body}</body></html>`,
      });
      // Fragment pour les artefacts Claude (le squelette est ajouté à la publication).
      this.emitFile({
        type: "asset",
        fileName: "session-planification.fragment.html",
        source: `${title}\n<style>${css}</style>\n${body}`,
      });
      delete bundle[htmlName];
    } },
  };
}

// https://vitejs.dev/config/
// Base de déploiement : "/" par défaut, "/depot/" pour GitHub Pages (VITE_BASE).
const rawBase = process.env.VITE_BASE || "/";
const base = `/${rawBase.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default defineConfig(({ mode }) => {
  const standalone = mode === "standalone";
  return {
  base: standalone ? "./" : base,
  publicDir: standalone ? false : "public",
  define: {
    __APP_BUILD__: appBuild,
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Only PHP endpoints use the optional PHP backend; everything else is
      // static content served by Vite. Operator-only endpoint groups are
      // proxied by a private source region.
      '^/(?:data/.*|mcp|sitemap|bot-tracker)\\.php(?:\\?|$)': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
  preview: {
    // No proxy during preview/prerender — static JSON files are served directly
    // from dist/ without needing the PHP backend.
    proxy: {},
  },
  plugins: [
    standaloneAssetsPlugin(standalone),
    standalone && singleFilePlugin(),
    !standalone && standaloneStaticPages(),
    !standalone && backendMirrorPlugin(),
    react(),
    !standalone && VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "Session planification – CRFPE",
        short_name: "Session planif.",
        description: "Planificateur de déroulés de séances du CRFPE : glisser-déposer, modèles et mode direct.",
        start_url: base,
        scope: base,
        display: "standalone",
        theme_color: "#004C8E",
        background_color: "#ffffff",
        lang: "fr",
        "icons": [
          { "src": `${base}pwa/icon-192.png`,          "sizes": "192x192", "type": "image/png", "purpose": "any" },
          { "src": `${base}pwa/icon-512.png`,          "sizes": "512x512", "type": "image/png", "purpose": "any" },
          { "src": `${base}pwa/icon-maskable-192.png`, "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
          { "src": `${base}pwa/icon-maskable-512.png`, "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
        ]
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        // Every route in this app (blog posts, templates, landing pages, legal
        // pages, ...) has its own server-rendered/prerendered HTML — there is no
        // generic "SPA shell" content for them to fall back to. The enterprise-page
        // incident above (denylist entries) showed the failure mode concretely: a
        // navigation not covered by an exception got served the cached homepage
        // shell instead of that route's own HTML, and React Router rendered
        // NotFound until the SW updated. Rather than denylisting routes one at a
        // time (and re-discovering this bug for every future page type), restrict
        // navigateFallback to an ALLOWLIST of the only routes that are legitimately
        // shell-only: the DE and EN homepages. Everything else always goes to the
        // network (or its own precache entry), so a repeat visitor's browser never
        // substitutes route-specific content with the generic shell.
        navigateFallbackAllowlist: [new RegExp(`^${escapeRe(base)}$`), new RegExp(`^${escapeRe(base)}en/?$`)],
        navigateFallbackDenylist: [
          new RegExp(`^${escapeRe(base)}data/`),
          new RegExp(`^${escapeRe(base)}(?:llms\\.txt|import-schema\\.md)$`),
          new RegExp(`^${escapeRe(base)}enterprise/?$`),
          new RegExp(`^${escapeRe(base)}en/enterprise/?$`),
        ],
        globPatterns: [
          // HTML is intentionally NOT globbed with **/ here: prerendering emits
          // one index.html per route (100+ files for blog/templates/landing
          // pages), and precaching all of them on install competes for bandwidth
          // with the page's own LCP request on first load. Only the root shell
          // (the one HTML file navigateFallback can ever serve, per the allowlist
          // above) needs to be precached; every other route's HTML is fetched
          // fresh from the network as it's visited.
          "index.html",
          "**/*.{js,css,ico,png,svg,webp,woff,woff2}",
          "**/*.{md,txt}",
          "locales/**/*.json",
          "data/defaultLibrary*.json",
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: standalone ? {
    outDir: "dist-standalone",
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100_000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  } : {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/") || id.includes("node_modules/scheduler")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/react-router-dom") || id.includes("node_modules/@remix-run") || id.includes("node_modules/react-router/")) {
            return "vendor-router";
          }
          if (id.includes("node_modules/@dnd-kit")) {
            return "vendor-dnd-kit";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-lucide";
          }
        },
      },
    },
  },
  };
});
