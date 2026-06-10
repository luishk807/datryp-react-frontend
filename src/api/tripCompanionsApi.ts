/**
 * REST wrapper for a Completed trip's "friends who joined" data. For every
 * OTHER member of the trip, returns their identity plus the rating they gave
 * the trip and their favorite place on it (highest-rated reviewed place among
 * the trip's stops). Member-only; mirrors the tripRating wrapper's shape.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface TripCompanion {
    userId: string;
    name: string | null;
    profileImageUrl: string | null;
    /** Their 1-5 rating of the trip; null when they haven't rated. */
    rating: number | null;
    /** Name of their highest-rated reviewed place on this trip; null when
     *  they haven't reviewed any of the trip's places. */
    favoritePlace: string | null;
}

interface TripCompanionPayload {
    user_id: string;
    name: string | null;
    profile_image_url: string | null;
    rating: number | null;
    favorite_place: string | null;
}

interface TripCompanionsPayload {
    companions: TripCompanionPayload[];
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

export const getTripCompanions = async (
    tripId: string
): Promise<TripCompanion[]> => {
    const resp = await fetch(`${API_BASE}/me/trip-companions/${tripId}`, {
        headers: { ...authHeaders() },
    });
    if (!resp.ok) await handleError(resp, 'get trip companions');
    const data = (await resp.json()) as TripCompanionsPayload;
    return data.companions.map((c) => ({
        userId: c.user_id,
        name: c.name,
        profileImageUrl: c.profile_image_url,
        rating: c.rating,
        favoritePlace: c.favorite_place,
    }));
};
