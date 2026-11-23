/** @file Locale-aware path helpers — deduplicates the `locale === 'en' ? '/en' : ''` pattern. */
import { type Locale, LOCALE_PREFIX } from './i18n';

/** Returns the URL prefix for a locale ('/en' or ''). */
export const getLocalePrefix = (locale: Locale): string => LOCALE_PREFIX[locale];

/** Builds a locale-aware path: `getLocalizedPath('en', '/blog')` → `'/en/blog'`. */
export const getLocalizedPath = (locale: Locale, path: string): string =>
  `${LOCALE_PREFIX[locale]}${path}`;

/** Returns the root path for a locale (`'/'` for FR, `'/en'` for EN). */
export const getLocaleRoot = (locale: Locale): string =>
  locale === 'en' ? '/en' : '/';

/** Creates `{ fr, en }` alternates for a symmetric path like `/blog` → `{ fr: '/blog', en: '/en/blog' }`. */
export const createSymmetricAlternates = (path: string): Record<Locale, string> => ({
  fr: path,
  en: `${LOCALE_PREFIX.en}${path}`,
});
