/**
 * Fetch layer for the Pro "personal take" — GET /me/destination-fit. Auth-gated
 * and Pro-only server-side; a 204 (free user, no interests saved, cap hit, or
 * empty generation) maps to null so the widget just hides the block. Best-effort
 * throughout: any error also maps to null — the AI take is a nice-to-have and
 * must never block the page.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface DestinationFitParams {
    /** Destination display name (city / country / place). */
    name: string;
    /** Country name for context. */
    country?: string;
    /** Which kind of detail page this is. */
    kind: 'country' | 'city' | 'place';
}

export const fetchDestinationFit = async ({
    name,
    country = '',
    kind,
}: DestinationFitParams): Promise<string | null> => {
    const token = getAuthToken();
    if (!token) return null;
    const params = new URLSearchParams({ name, country, kind });
    try {
        const resp = await fetch(
            `${API_BASE}/me/destination-fit?${params.toString()}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!resp.ok) return null; // 204, 402, 5xx… → no take, never throw
        const body = (await resp.json()) as { opinion?: string };
        return body.opinion?.trim() || null;
    } catch {
        return null;
    }
};
