/**
 * basePath — Support d'un déploiement dans un sous-chemin (GitHub Pages).
 *
 * Role: Vite expose `import.meta.env.BASE_URL` ("/" par défaut, "/depot/" sur
 *       GitHub Pages). Tous les chemins absolus vers des fichiers statiques
 *       (locales, données, images, sons) passent par `withBase`, et le routeur
 *       utilise `ROUTER_BASENAME`. Avec la base "/", rien ne change.
 */

/** Base de déploiement, toujours terminée par "/". */
export const BASE_URL: string = import.meta.env.BASE_URL || '/';

/** Basename du routeur : "" à la racine, "/depot" dans un sous-chemin. */
export const ROUTER_BASENAME: string = BASE_URL.replace(/\/+$/, '');

/** Préfixe un chemin absolu ("/data/x.json") par la base de déploiement. */
export const withBase = (path: string): string =>
  path.startsWith('/') && !path.startsWith('//') ? `${ROUTER_BASENAME}${path}` : path;

/** Retire la base d'un chemin d'URL du navigateur ("/depot/en/blog" → "/en/blog"). */
export const stripBase = (pathname: string): string => {
  if (!ROUTER_BASENAME) return pathname;
  if (pathname === ROUTER_BASENAME) return '/';
  return pathname.startsWith(`${ROUTER_BASENAME}/`) ? pathname.slice(ROUTER_BASENAME.length) : pathname;
};
