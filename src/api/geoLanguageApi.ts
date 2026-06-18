/**
 * `GET /geo/language` — server-side GeoIP language hint.
 *
 * The backend reads the visitor's IP from the proxy headers, geolocates it to
 * a country, and returns 'es' for Spanish-speaking countries / 'en' otherwise
 * (null when it can't tell). We call this ONLY for a first-time visitor who
 * hasn't explicitly picked a language — see `i18n/geoBootstrap`. Fail-soft:
 * any network/parse error resolves to null so the caller keeps the browser
 * language default.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface GeoLanguageRaw {
    lang: 'en' | 'es' | null;
    country: string | null;
}

/** Resolves to the suggested base language, or null when undeterminable. */
export const fetchSuggestedLanguage = async (
    signal?: AbortSignal,
): Promise<'en' | 'es' | null> => {
    try {
        const resp = await fetch(`${API_BASE}/geo/language`, { signal });
        if (!resp.ok) return null;
        const body = (await resp.json()) as GeoLanguageRaw;
        return body.lang === 'es' || body.lang === 'en' ? body.lang : null;
    } catch {
        return null;
    }
};
