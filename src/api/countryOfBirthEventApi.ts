/**
 * `/me/country-of-birth-event` — biggest upcoming event in the user's
 * country of birth + 4 host cities. Mirrors the shape of
 * `/me/world-event` but personalized per-user via the
 * `country_of_birth_code` profile field.
 *
 * Returns null on:
 *   - 204 (user hasn't set a country of birth, or no major event in the
 *     next ~120 days for that country).
 *
 * Anything else non-2xx surfaces as a thrown Error.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface CountryOfBirthEventInfo {
    name: string;
    startDate: string;
    endDate: string;
    hostCountry: string;
    description: string;
    hype: string;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface CountryOfBirthEventPlace {
    name: string;
    country: string;
    countryCode: string;
    why: string;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface CountryOfBirthEventResult {
    event: CountryOfBirthEventInfo;
    places: CountryOfBirthEventPlace[];
}

interface InfoRaw {
    name: string;
    start_date: string;
    end_date: string;
    host_country: string;
    description: string;
    hype: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface PlaceRaw {
    name: string;
    country: string;
    country_code: string;
    why: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface ResponseRaw {
    event: InfoRaw;
    places: PlaceRaw[];
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toEvent = (r: InfoRaw): CountryOfBirthEventInfo => ({
    name: r.name,
    startDate: r.start_date,
    endDate: r.end_date,
    hostCountry: r.host_country,
    description: r.description,
    hype: r.hype,
    imageUrl: r.image_url,
    photographerName: r.photographer_name,
    photographerUrl: r.photographer_url,
});

const toPlace = (r: PlaceRaw): CountryOfBirthEventPlace => ({
    name: r.name,
    country: r.country,
    countryCode: r.country_code,
    why: r.why,
    imageUrl: r.image_url,
    photographerName: r.photographer_name,
    photographerUrl: r.photographer_url,
});

/** Returns null when the backend returns 204 (no country of birth set,
 *  or no major event in that country's next ~120 days). */
export const fetchCountryOfBirthEvent = async (): Promise<
    CountryOfBirthEventResult | null
> => {
    const resp = await fetch(`${API_BASE}/me/country-of-birth-event`, {
        headers: authHeaders(),
    });
    if (resp.status === 204) return null;
    if (!resp.ok) {
        let detail: string | undefined;
        try {
            const body = await resp.json();
            if (typeof body?.detail === 'string') detail = body.detail;
        } catch {
            /* ignore */
        }
        throw new Error(
            `/me/country-of-birth-event ${resp.status}${
                detail ? ` — ${detail}` : ''
            }`,
        );
    }
    const body = (await resp.json()) as ResponseRaw;
    return {
        event: toEvent(body.event),
        places: body.places.map(toPlace),
    };
};
