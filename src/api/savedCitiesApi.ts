/**
 * REST wrappers for the Python backend's saved-cities endpoints.
 *
 * All endpoints require a Bearer token (auth-gated by `/me/...`). The
 * slug is derived server-side from name + country code via the same
 * `slugify_city` helper city_details uses, so the client doesn't
 * construct it.
 */
import { getAuthToken } from './authStorage';
import type {
    SavedCity,
    SavedCityCreatePayload,
    SavedSource,
} from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface SavedCityRaw {
    id: string;
    city_slug: string;
    city_name: string;
    country_name: string;
    country_code: string;
    image_url: string | null;
    source: SavedSource;
    saved_at: string;
}

interface SavedCitiesResponseRaw {
    items: SavedCityRaw[];
    total: number;
}

export interface SavedCitiesResponse {
    items: SavedCity[];
    total: number;
}

const toItem = (r: SavedCityRaw): SavedCity => ({
    id: r.id,
    citySlug: r.city_slug,
    cityName: r.city_name,
    countryName: r.country_name,
    countryCode: r.country_code,
    imageUrl: r.image_url,
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

export const fetchSavedCities = async (): Promise<SavedCitiesResponse> => {
    const resp = await fetch(`${API_BASE}/me/saved/cities`, {
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, '/me/saved/cities');
    const body = (await resp.json()) as SavedCitiesResponseRaw;
    return {
        items: body.items.map(toItem),
        total: body.total,
    };
};

export const saveCity = async (
    payload: SavedCityCreatePayload
): Promise<SavedCity> => {
    const resp = await fetch(`${API_BASE}/me/saved/cities`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({
            name: payload.name,
            country: payload.country,
            code: payload.code,
            image_url: payload.imageUrl ?? null,
        }),
    });
    if (!resp.ok) await handleError(resp, 'save city');
    return toItem((await resp.json()) as SavedCityRaw);
};

export const unsaveCity = async (slug: string): Promise<void> => {
    const resp = await fetch(
        `${API_BASE}/me/saved/cities/${encodeURIComponent(slug)}`,
        {
            method: 'DELETE',
            headers: authHeaders(),
        }
    );
    if (!resp.ok) await handleError(resp, 'unsave city');
};
