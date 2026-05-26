/**
 * `/me/similar-to-saves` — ML-driven homepage box.
 *
 * Backed by sentence-transformers + chroma on the Python backend.
 * Returns up to 6 places similar to the user's saved set (with
 * already-saved/already-visited filtered out). Free for everyone —
 * local ML compute, no per-call OpenAI cost.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface SimilarPlaceItem {
    placeKey: string;
    name: string;
    city: string;
    country: string;
    countryCode: string | null;
    imageUrl: string | null;
    /** Source's original best-time-to-visit string when available in
     *  the chroma metadata. Used for the card tagline. */
    bestTimeToVisit: string | null;
    /** Cosine similarity to the user's taste vector, in [0, 1]. Higher
     *  = closer match to what they've already saved. */
    similarity: number;
}

export interface SimilarToSavesResult {
    items: SimilarPlaceItem[];
}

interface SimilarPlaceItemRaw {
    place_key: string;
    name: string;
    city: string;
    country: string;
    country_code: string | null;
    image_url: string | null;
    best_time_to_visit: string | null;
    similarity: number;
}

interface SimilarToSavesRaw {
    items: SimilarPlaceItemRaw[];
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toItem = (r: SimilarPlaceItemRaw): SimilarPlaceItem => ({
    placeKey: r.place_key,
    name: r.name,
    city: r.city,
    country: r.country,
    countryCode: r.country_code,
    imageUrl: r.image_url,
    bestTimeToVisit: r.best_time_to_visit,
    similarity: r.similarity,
});

export const fetchSimilarToSaves =
    async (): Promise<SimilarToSavesResult> => {
        const resp = await fetch(`${API_BASE}/me/similar-to-saves`, {
            headers: authHeaders(),
        });
        if (!resp.ok) {
            let detail: string | undefined;
            try {
                const body = await resp.json();
                if (typeof body?.detail === 'string') detail = body.detail;
            } catch {
                /* ignore */
            }
            throw new Error(
                `/me/similar-to-saves ${resp.status}${
                    detail ? ` — ${detail}` : ''
                }`
            );
        }
        const body = (await resp.json()) as SimilarToSavesRaw;
        return { items: body.items.map(toItem) };
    };
