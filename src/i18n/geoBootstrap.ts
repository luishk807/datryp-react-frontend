/**
 * First-visit GeoIP language default.
 *
 * Runs once at boot, AFTER i18next has initialised in the browser's language
 * (the instant, no-flash provisional). For a genuinely first-time visitor —
 * one with no language stored before init — it asks the backend to geolocate
 * their IP and, if that resolves to Spanish vs English, switches to it and
 * persists the choice so later visits load instantly without another lookup.
 *
 * It never overrides a language the visitor already has (explicit EN|ES choice
 * or a prior resolved one) — that's gated on `hadStoredLanguage`, snapshotted
 * before init. Fail-soft: if geo can't determine a country, we keep the
 * browser-language default. Fire-and-forget from `main.tsx`.
 */
import i18n, { LANGUAGE_STORAGE_KEY, hadStoredLanguage } from 'i18n';
import { fetchSuggestedLanguage } from 'api/geoLanguageApi';

let started = false;

export const bootstrapGeoLanguage = async (): Promise<void> => {
    if (started) return;
    started = true;

    // The visitor already has a language (used the switcher, or a previous
    // visit resolved one) — respect it, never override.
    if (hadStoredLanguage) return;

    const suggested = await fetchSuggestedLanguage();
    if (!suggested) return; // couldn't geolocate → keep the browser-language default

    // Persist so subsequent visits load this instantly and don't re-hit the
    // GeoIP endpoint, even when it matches the current (browser) language.
    try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, suggested);
    } catch {
        /* private mode / storage disabled — non-fatal, just no persistence */
    }

    const current = (i18n.resolvedLanguage || i18n.language || 'en')
        .toLowerCase()
        .split('-')[0];
    if (suggested !== current) {
        await i18n.changeLanguage(suggested);
    }
};
