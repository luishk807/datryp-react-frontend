/**
 * `/places/rating` — Google Places (New) proxy on our backend.
 * Resolves a place name (+ optional location context) to a rating +
 * review count. Backend caches aggressively; we just speak JSON.
 *
 * Returns `null` on no-match, missing-key (503), or any error — the
 * caller renders nothing in that case (silent-fail UX).
 */
import { getAuthToken } from 'api/authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface PlaceRating {
    placeId: string | null;
    name: string | null;
    rating: number | null;
    userRatingCount: number | null;
    googleMapsUri: string | null;
    /** Full street address from Google ("Champ de Mars, 5 Av. Anatole
     *  France, 75007 Paris, France"). Used by the smart-entry watcher
     *  to fill the activity location. */
    formattedAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    /** First photo URL from Google Places (a stable
     *  `lh3.googleusercontent.com` link). Used as an image fallback
     *  when Unsplash has no match for the place name. */
    photoUrl: string | null;
}

interface PlaceRatingRaw {
    place_id: string | null;
    name: string | null;
    rating: number | null;
    user_rating_count: number | null;
    google_maps_uri: string | null;
    formatted_address: string | null;
    latitude: number | null;
    longitude: number | null;
    photo_url: string | null;
}

interface PlaceRatingResponseRaw {
    result: PlaceRatingRaw | null;
}

const toRating = (r: PlaceRatingRaw): PlaceRating => ({
    placeId: r.place_id,
    name: r.name,
    rating: r.rating,
    userRatingCount: r.user_rating_count,
    googleMapsUri: r.google_maps_uri,
    formattedAddress: r.formatted_address,
    latitude: r.latitude,
    longitude: r.longitude,
    photoUrl: r.photo_url,
});

/** Which Google fields to fetch — drives the billing tier on the
 *  backend. Request the narrowest variant a surface uses:
 *   - `'rating'`: star + review count only (no photo call) — RatingBadge.
 *   - `'place'`: address + coords + photo (no rating) — smart entry.
 *   - `'all'`: everything (default) — the place-detail page. */
export type PlaceRatingFields = 'rating' | 'place' | 'all';

export const fetchPlaceRating = async (
    name: string,
    location?: string,
    fields: PlaceRatingFields = 'all',
): Promise<PlaceRating | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const params = new URLSearchParams({ name: trimmed, fields });
    if (location?.trim()) {
        params.set('location', location.trim());
    }
    // /places/rating is Pro-gated on the backend — forward the bearer
    // token so it can resolve the caller's plan. Non-Pro / anonymous get
    // an empty result, which collapses to `null` here (chip renders nothing).
    const token = getAuthToken();
    const resp = await fetch(`${API_BASE}/places/rating?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!resp.ok) return null;
    const body = (await resp.json()) as PlaceRatingResponseRaw;
    return body.result ? toRating(body.result) : null;
};
