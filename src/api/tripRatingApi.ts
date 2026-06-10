/**
 * REST wrapper for a trip's per-user star rating. Any trip member (owner,
 * organizer, or invited participant) can leave one 1-5 rating; `rating` null
 * or 0 clears it. Reads return the viewer's own rating plus the trip-wide
 * average + count. Mirrors the tripNote wrapper's fetch + bearer-token shape.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface TripRating {
    /** The viewer's own 1-5 rating; null when they haven't rated yet. */
    myRating: number | null;
    /** Average across all members' ratings (1 dp); null when nobody rated. */
    average: number | null;
    /** How many members have rated. */
    count: number;
}

interface TripRatingPayload {
    my_rating: number | null;
    average: number | null;
    count: number;
}

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

const fromPayload = (p: TripRatingPayload): TripRating => ({
    myRating: p.my_rating,
    average: p.average,
    count: p.count,
});

export const getTripRating = async (tripId: string): Promise<TripRating> => {
    const resp = await fetch(`${API_BASE}/me/trip-rating/${tripId}`, {
        headers: { ...authHeaders() },
    });
    if (!resp.ok) await handleError(resp, 'get trip rating');
    return fromPayload((await resp.json()) as TripRatingPayload);
};

export const setTripRating = async (
    tripId: string,
    rating: number | null
): Promise<TripRating> => {
    const resp = await fetch(`${API_BASE}/me/trip-rating/${tripId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ rating }),
    });
    if (!resp.ok) await handleError(resp, 'set trip rating');
    return fromPayload((await resp.json()) as TripRatingPayload);
};
