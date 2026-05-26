/**
 * REST wrappers for the Python backend's visited-cities endpoints.
 *
 * All endpoints require a Bearer token (auth-gated by `/me/...`). The slug
 * is derived server-side from name + country code via the same
 * `slugify_city` helper city_details uses, so the client doesn't construct it.
 */
import { getAuthToken } from './authStorage';
import type {
    VisitedCity,
    VisitedCityCreatePayload,
    VisitedSource,
} from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface VisitedCityRaw {
    id: string;
    city_slug: string;
    city_name: string;
    country_name: string;
    country_code: string;
    latitude: number | null;
    longitude: number | null;
    source: VisitedSource;
    visited_at: string;
}

interface VisitedCitiesResponseRaw {
    items: VisitedCityRaw[];
    total: number;
}

export interface VisitedCitiesResponse {
    items: VisitedCity[];
    total: number;
}

const toItem = (r: VisitedCityRaw): VisitedCity => ({
    id: r.id,
    citySlug: r.city_slug,
    cityName: r.city_name,
    countryName: r.country_name,
    countryCode: r.country_code,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
    source: r.source,
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

export const fetchVisitedCities =
    async (): Promise<VisitedCitiesResponse> => {
        const resp = await fetch(`${API_BASE}/me/visited-cities`, {
            headers: authHeaders(),
        });
        if (!resp.ok) await handleError(resp, '/me/visited-cities');
        const body = (await resp.json()) as VisitedCitiesResponseRaw;
        return {
            items: body.items.map(toItem),
            total: body.total,
        };
    };

export const markVisitedCity = async (
    payload: VisitedCityCreatePayload
): Promise<VisitedCity> => {
    const resp = await fetch(`${API_BASE}/me/visited-cities`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({
            name: payload.name,
            country: payload.country,
            code: payload.code,
        }),
    });
    if (!resp.ok) await handleError(resp, 'mark city visited');
    return toItem((await resp.json()) as VisitedCityRaw);
};

export const unmarkVisitedCity = async (slug: string): Promise<void> => {
    const resp = await fetch(
        `${API_BASE}/me/visited-cities/${encodeURIComponent(slug)}`,
        {
            method: 'DELETE',
            headers: authHeaders(),
        }
    );
    if (!resp.ok) await handleError(resp, 'unmark city visited');
};
