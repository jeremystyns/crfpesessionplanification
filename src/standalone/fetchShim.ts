/**
 * fetchShim — Sert les fichiers embarqués à la place du réseau (build autonome).
 *
 * Role: i18next, les loaders et la bibliothèque par défaut utilisent `fetch`
 *       sur des chemins comme /locales/fr/common.json. En mode autonome ces
 *       fichiers sont dans le bundle ; tout le reste (sessions serveur, retours,
 *       statistiques) échoue proprement, comme hors ligne.
 */
import { standaloneFiles } from 'virtual:standalone-assets';

const nativeFetch = window.fetch.bind(window);

const toPath = (input: RequestInfo | URL): string | null => {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (/^https?:\/\//i.test(raw)) return null;
    return new URL(raw, 'http://local/').pathname;
  } catch {
    return null;
  }
};

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const path = toPath(input);
  if (path === null) return nativeFetch(input, init);
  const body = standaloneFiles[path];
  if (body !== undefined) {
    return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (path.endsWith('.php')) throw new TypeError('Hors ligne : fonction serveur indisponible.');
  return new Response('Not found', { status: 404 });
};
