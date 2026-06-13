/**
 * i18next setup — English + Spanish, translations bundled from JSON files.
 *
 * Resources are imported (not fetched), so init is synchronous: there's no
 * loading flash and the strings ship inside the JS bundle, which keeps the
 * PWA/offline shell fully localized. The chosen language is detected from
 * localStorage (then the browser) and persisted back to localStorage, so a
 * reload — and offline sessions — keep the user's choice.
 *
 * Import this module once for its side effect (`import 'i18n'` in main.tsx)
 * to initialise i18next before the app renders. The default export is the
 * live instance — the API layer reads `i18n.language` to tag dynamic-content
 * requests with `?lang=` (Phase B).
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Persisted-choice key — also the value the dynamic-content `?lang=` reads. */
export const LANGUAGE_STORAGE_KEY = 'datryp_lang';

/** The active content language as a supported base code ('en' | 'es'),
 *  collapsing regional variants and falling back to English. Read by the
 *  dynamic-content API wrappers to tag `?lang=` on detail requests, and by the
 *  matching React Query keys so EN/ES responses cache separately. NOT reactive
 *  on its own — components that must re-render on a language change should also
 *  use `useTranslation()` (or read `i18n.language`) so the query key updates. */
export const activeLang = (): SupportedLanguage => {
    const base = (i18n.resolvedLanguage || i18n.language || 'en')
        .toLowerCase()
        .split('-')[0];
    return (SUPPORTED_LANGUAGES as readonly string[]).includes(base)
        ? (base as SupportedLanguage)
        : 'en';
};

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            es: { translation: es },
        },
        fallbackLng: 'en',
        supportedLngs: [...SUPPORTED_LANGUAGES],
        // Map regional variants (es-MX, es-419, en-GB) onto the base language
        // so a Spanish browser lands on `es` rather than the fallback.
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        interpolation: {
            // React already escapes rendered values — double-escaping would
            // turn apostrophes/quotes in our copy into entities.
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        },
        returnNull: false,
    });

export default i18n;
