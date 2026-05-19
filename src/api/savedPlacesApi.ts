/**
 * REST wrappers for the Python backend's saved-places endpoints.
 *
 * All endpoints require a Bearer token (auth-gated by `/me/...`).
 * `place_key` is recomputed server-side from name/city/country via the
 * same `slugify_place` helper reviews and visited use, so the client
 * doesn't pass it.
 */
import { getAuthToken } from './authStorage';
import type {
    SavedPlace,
    SavedPlaceCreatePayload,
    SavedSource,
} from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface SavedPlaceRaw {
    id: string;
    place_key: string;
    place_name: string;
    place_city: string;
    place_country: string;
    country_code: string | null;
    image_url: string | null;
    search_query: string | null;
    search_index: number | null;
    source: SavedSource;
    saved_at: string;
}

interface SavedPlacesResponseRaw {
    items: SavedPlaceRaw[];
    total: number;
}

export interface SavedPlacesResponse {
    items: SavedPlace[];
    total: number;
}

const toItem = (r: SavedPlaceRaw): SavedPlace => ({
    id: r.id,
    placeKey: r.place_key,
    placeName: r.place_name,
    placeCity: r.place_city,
    placeCountry: r.place_country,
    countryCode: r.country_code,
    imageUrl: r.image_url,
    searchQuery: r.search_query,
    searchIndex: r.search_index,
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

export const fetchSavedPlaces = async (): Promise<SavedPlacesResponse> => {
    const resp = await fetch(`${API_BASE}/me/saved/places`, {
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, '/me/saved/places');
    const body = (await resp.json()) as SavedPlacesResponseRaw;
    return {
        items: body.items.map(toItem),
        total: body.total,
    };
};

export const savePlace = async (
    payload: SavedPlaceCreatePayload
): Promise<SavedPlace> => {
    const resp = await fetch(`${API_BASE}/me/saved/places`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({
            place_name: payload.placeName,
            place_city: payload.placeCity,
            place_country: payload.placeCountry,
            country_code: payload.countryCode ?? null,
            image_url: payload.imageUrl ?? null,
            search_query: payload.searchQuery ?? null,
            search_index: payload.searchIndex ?? null,
        }),
    });
    if (!resp.ok) await handleError(resp, 'save place');
    return toItem((await resp.json()) as SavedPlaceRaw);
};

export const unsavePlace = async (placeKey: string): Promise<void> => {
    const resp = await fetch(
        `${API_BASE}/me/saved/places/${encodeURIComponent(placeKey)}`,
        {
            method: 'DELETE',
            headers: authHeaders(),
        }
    );
    if (!resp.ok) await handleError(resp, 'unsave place');
};
