/**
 * Fetch wrappers for the progressive "show text first" endpoints:
 *   GET /city-details/quick?name&country&code
 *   GET /country-details/quick?code
 *
 * These return just the narrative prose (the cheap, fast OpenAI call) so the
 * detail pages can render the "about" text within a second or two while the
 * full details call (lists + facts + per-tip images) finishes. REST, snake_case
 * on the wire — reshaped to camelCase here.
 */
import { activeLang } from "i18n";

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? "http://localhost:8000";

/** Narrative-only slice shared by the city + country quick endpoints. */
export interface DestinationProse {
    longDescription: string | null;
    countryDescription: string | null;
    budgetDescription: string | null;
}

interface DestinationProseRaw {
    long_description: string | null;
    country_description: string | null;
    budget_description: string | null;
}

const toProse = (raw: DestinationProseRaw): DestinationProse => ({
    longDescription: raw.long_description ?? null,
    countryDescription: raw.country_description ?? null,
    budgetDescription: raw.budget_description ?? null,
});

export const fetchCityQuick = async (
    name: string,
    country: string,
    code: string
): Promise<DestinationProse> => {
    const params = new URLSearchParams({ name, country, code, lang: activeLang() });
    const resp = await fetch(`${API_BASE}/city-details/quick?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/city-details/quick failed: ${resp.status} ${resp.statusText}`
        );
    }
    return toProse((await resp.json()) as DestinationProseRaw);
};

export const fetchCountryQuick = async (
    code: string
): Promise<DestinationProse> => {
    const params = new URLSearchParams({ code, lang: activeLang() });
    const resp = await fetch(`${API_BASE}/country-details/quick?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/country-details/quick failed: ${resp.status} ${resp.statusText}`
        );
    }
    return toProse((await resp.json()) as DestinationProseRaw);
};
