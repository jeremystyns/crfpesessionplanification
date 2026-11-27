/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_BUILD__: number;

interface ImportMetaEnv {
  /** Canonical public base URL (SEO, structured data). Defaults to the upstream domain. */
  readonly VITE_PUBLIC_BASE_URL?: string;
  readonly VITE_SESSIONS_API?: string;
}

declare module 'virtual:standalone-assets' {
  /** Chemin public ("/assets/ding.mp3") → data: URI, vide hors build autonome. */
  export const standaloneAssets: Record<string, string>;
  /** Chemin public ("/data/x.json") → contenu texte, vide hors build autonome. */
  export const standaloneFiles: Record<string, string>;
}
