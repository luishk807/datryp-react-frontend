/**
 * REST wrappers for the Python backend's visited-countries endpoints.
 *
 * All endpoints require a Bearer token (auth-gated by `/me/...`). The
 * country is identified on the wire by its ISO 3166-1 alpha-2 code; the
 * backend resolves to the `countries.id` UUID so the client doesn't write
 * to an arbitrary FK.
 */
import { getAuthToken } from './authStorage';
import type { VisitedCountry, VisitedSource } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface VisitedCountryRaw {
    id: string;
    country_id: string;
    country_name: string;
    country_code: string;
    country_image: string | null;
    source: VisitedSource;
    visited_at: string;
}

interface VisitedCountriesResponseRaw {
    items: VisitedCountryRaw[];
    total: number;
}

export interface VisitedCountriesResponse {
    items: VisitedCountry[];
    total: number;
}

const toItem = (r: VisitedCountryRaw): VisitedCountry => ({
    id: r.id,
    countryId: r.country_id,
    countryName: r.country_name,
    countryCode: r.country_code,
    countryImage: r.country_image,
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

export const fetchVisitedCountries =
    async (): Promise<VisitedCountriesResponse> => {
        const resp = await fetch(`${API_BASE}/me/visited-countries`, {
            headers: authHeaders(),
        });
        if (!resp.ok) await handleError(resp, '/me/visited-countries');
        const body = (await resp.json()) as VisitedCountriesResponseRaw;
        return {
            items: body.items.map(toItem),
            total: body.total,
        };
    };

export const markVisitedCountry = async (
    code: string
): Promise<VisitedCountry> => {
    const resp = await fetch(`${API_BASE}/me/visited-countries`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({ code }),
    });
    if (!resp.ok) await handleError(resp, 'mark country visited');
    return toItem((await resp.json()) as VisitedCountryRaw);
};

export const unmarkVisitedCountry = async (code: string): Promise<void> => {
    const resp = await fetch(
        `${API_BASE}/me/visited-countries/${encodeURIComponent(code)}`,
        {
            method: 'DELETE',
            headers: authHeaders(),
        }
    );
    if (!resp.ok) await handleError(resp, 'unmark country visited');
};
