/**
 * Fetch wrapper for `GET /place-recommendations` on the Python backend.
 * REST (not GraphQL) — see backend `app/routers/place_recommendations.py`.
 */
import type {
    PlaceDetails,
    PlaceDetailsResult,
    PlaceRecommendation,
    PlaceRecommendationsResult,
} from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface PlaceItemRaw {
    name: string;
    city: string;
    country: string;
    rating: number;
    best_time_to_visit: string;
    description: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface PlaceRecommendationsResponseRaw {
    query: string;
    cached: boolean;
    items: PlaceItemRaw[];
}

const toPlace = (raw: PlaceItemRaw): PlaceRecommendation => ({
    name: raw.name,
    city: raw.city,
    country: raw.country,
    rating: raw.rating,
    bestTimeToVisit: raw.best_time_to_visit,
    description: raw.description,
    imageUrl: raw.image_url,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
});

export const fetchPlaceRecommendations = async (
    query: string,
    limit = 2
): Promise<PlaceRecommendationsResult> => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const resp = await fetch(`${API_BASE}/place-recommendations?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/place-recommendations failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as PlaceRecommendationsResponseRaw;
    return {
        query: body.query,
        cached: body.cached,
        items: body.items.map(toPlace),
    };
};

// ─── /place-details ────────────────────────────────────────────────────────

interface PlaceDetailsRaw {
    foods: { name: string; why: string }[];
    places_to_visit: { name: string; why: string }[];
    worst_time_to_visit: string;
    weather: string;
}

interface PlaceDetailsResponseRaw {
    query: string;
    index: number;
    cached: boolean;
    details: PlaceDetailsRaw;
}

const toDetails = (raw: PlaceDetailsRaw): PlaceDetails => ({
    foods: raw.foods,
    placesToVisit: raw.places_to_visit,
    worstTimeToVisit: raw.worst_time_to_visit,
    weather: raw.weather,
});

export const fetchPlaceDetails = async (
    query: string,
    index: number
): Promise<PlaceDetailsResult> => {
    const params = new URLSearchParams({ q: query, i: String(index) });
    const resp = await fetch(`${API_BASE}/place-details?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/place-details failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as PlaceDetailsResponseRaw;
    return {
        query: body.query,
        index: body.index,
        cached: body.cached,
        details: toDetails(body.details),
    };
};
