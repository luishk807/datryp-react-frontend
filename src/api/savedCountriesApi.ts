/**
 * REST wrappers for the Python backend's saved-countries endpoints.
 *
 * All endpoints require a Bearer token (auth-gated by `/me/...`). The
 * country is identified on the wire by its ISO 3166-1 alpha-2 code; the
 * backend resolves to the `countries.id` UUID so the client doesn't
 * write to an arbitrary FK.
 */
import { getAuthToken } from './authStorage';
import type { SavedCountry, SavedSource } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface SavedCountryRaw {
    id: string;
    country_id: string;
    country_name: string;
    country_code: string;
    country_image: string | null;
    source: SavedSource;
    saved_at: string;
}

interface SavedCountriesResponseRaw {
    items: SavedCountryRaw[];
    total: number;
}

export interface SavedCountriesResponse {
    items: SavedCountry[];
    total: number;
}

const toItem = (r: SavedCountryRaw): SavedCountry => ({
    id: r.id,
    countryId: r.country_id,
    countryName: r.country_name,
    countryCode: r.country_code,
    countryImage: r.country_image,
    source: r.source,
    savedAt: r.saved_at,
});

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleError = async (resp: Response, label: string): Promise<never> => {
    let detail: string | undefined;
    try {
        const body = await resp.json();
        if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
        /* ignore */
    }
    throw new Error(
        `${label} ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`
    );
};

export const fetchSavedCountries =
    async (): Promise<SavedCountriesResponse> => {
        const resp = await fetch(`${API_BASE}/me/saved/countries`, {
            headers: authHeaders(),
        });
        if (!resp.ok) await handleError(resp, '/me/saved/countries');
        const body = (await resp.json()) as SavedCountriesResponseRaw;
        return {
            items: body.items.map(toItem),
            total: body.total,
        };
    };

export const saveCountry = async (code: string): Promise<SavedCountry> => {
    const resp = await fetch(`${API_BASE}/me/saved/countries`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({ code }),
    });
    if (!resp.ok) await handleError(resp, 'save country');
    return toItem((await resp.json()) as SavedCountryRaw);
};

export const unsaveCountry = async (code: string): Promise<void> => {
    const resp = await fetch(
        `${API_BASE}/me/saved/countries/${encodeURIComponent(code)}`,
        {
            method: 'DELETE',
            headers: authHeaders(),
        }
    );
    if (!resp.ok) await handleError(resp, 'unsave country');
};
