/**
 * `/me/place-suggestions` — personalized destination picks based on the
 * user's onboarding preferences (interests, traveler styles, dream
 * destinations). Powers the "Places you might love" homepage section.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface PlaceSuggestion {
    name: string;
    country: string;
    countryCode: string;
    why: string;
    imageUrl: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

interface PlaceSuggestionRaw {
    name: string;
    country: string;
    country_code: string;
    why: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface PlaceSuggestionsRaw {
    items: PlaceSuggestionRaw[];
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toSuggestion = (r: PlaceSuggestionRaw): PlaceSuggestion => ({
    name: r.name,
    country: r.country,
    countryCode: r.country_code,
    why: r.why,
    imageUrl: r.image_url,
    photographerName: r.photographer_name,
    photographerUrl: r.photographer_url,
});

export const fetchPlaceSuggestions = async (): Promise<PlaceSuggestion[]> => {
    const resp = await fetch(`${API_BASE}/me/place-suggestions`, {
        headers: authHeaders(),
    });
    if (!resp.ok) {
        let detail: string | undefined;
        try {
            const body = await resp.json();
            if (typeof body?.detail === 'string') detail = body.detail;
        } catch {
            /* ignore */
        }
        throw new Error(
            `/me/place-suggestions ${resp.status}${detail ? ` — ${detail}` : ''}`
        );
    }
    const body = (await resp.json()) as PlaceSuggestionsRaw;
    return body.items.map(toSuggestion);
};
