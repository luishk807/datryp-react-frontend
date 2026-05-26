/**
 * REST wrappers for the Python backend's visited-places endpoints.
 *
 * All endpoints require a Bearer token (auth-gated by `/me/...`).
 * `place_key` is recomputed server-side from name/city/country via the same
 * `slugify_place` helper reviews use, so the client doesn't pass it.
 */
import { getAuthToken } from './authStorage';
import type {
    VisitedPlace,
    VisitedPlaceCreatePayload,
    VisitedSource,
} from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface VisitedPlaceRaw {
    id: string;
    place_key: string;
    place_name: string;
    place_city: string;
    place_country: string;
    country_code: string | null;
    region_code: string | null;
    region_name: string | null;
    latitude: number | null;
    longitude: number | null;
    source: VisitedSource;
    trip_id: string | null;
    trip_name: string | null;
    visited_at: string;
}

interface VisitedPlacesResponseRaw {
    items: VisitedPlaceRaw[];
    total: number;
}

export interface VisitedPlacesResponse {
    items: VisitedPlace[];
    total: number;
}

const toItem = (r: VisitedPlaceRaw): VisitedPlace => ({
    id: r.id,
    placeKey: r.place_key,
    placeName: r.place_name,
    placeCity: r.place_city,
    placeCountry: r.place_country,
    countryCode: r.country_code,
    regionCode: r.region_code,
    regionName: r.region_name,
    latitude: r.latitude,
    longitude: r.longitude,
    source: r.source,
    tripId: r.trip_id ?? null,
    tripName: r.trip_name ?? null,
    visitedAt: r.visited_at,
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

export const fetchVisited = async (): Promise<VisitedPlacesResponse> => {
    const resp = await fetch(`${API_BASE}/me/visited`, {
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, '/me/visited');
    const body = (await resp.json()) as VisitedPlacesResponseRaw;
    return {
        items: body.items.map(toItem),
        total: body.total,
    };
};

export const markVisited = async (
    payload: VisitedPlaceCreatePayload
): Promise<VisitedPlace> => {
    const resp = await fetch(`${API_BASE}/me/visited`, {
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
            latitude: payload.latitude ?? null,
            longitude: payload.longitude ?? null,
        }),
    });
    if (!resp.ok) await handleError(resp, 'mark visited');
    return toItem((await resp.json()) as VisitedPlaceRaw);
};

export const unmarkVisited = async (placeKey: string): Promise<void> => {
    const resp = await fetch(
        `${API_BASE}/me/visited/${encodeURIComponent(placeKey)}`,
        {
            method: 'DELETE',
            headers: authHeaders(),
        }
    );
    if (!resp.ok) await handleError(resp, 'unmark visited');
};
