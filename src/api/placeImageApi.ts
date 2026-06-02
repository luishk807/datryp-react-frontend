/**
 * Wrapper for the Python backend's `/places/image` endpoint.
 *
 * Cache-aware hero-image resolver for a specific place. Unlike
 * `/photo-search` (a stateless Unsplash proxy), this endpoint resolves
 * through cache → Unsplash → Pexels → Pixabay and persists the first
 * hit, so every later viewer is served the same image from our DB
 * without another third-party call. Used by the place-detail hero as the
 * fallback when the recommender row arrives without an `image_url`.
 *
 * Response shape mirrors `/photo-search` plus a `source` field, so it
 * drops into PlaceHero without an adapter.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface PlaceImageResult {
    imageUrl: string;
    photographerName: string | null;
    photographerUrl: string | null;
    /** Which provider supplied the photo: 'unsplash' | 'pexels' | 'pixabay'. */
    source: string;
}

interface PlaceImageResponseRaw {
    image_url: string;
    photographer_name: string | null;
    photographer_url: string | null;
    source: string;
}

export const fetchPlaceImage = async (
    name: string,
    city?: string | null,
    country?: string | null,
): Promise<PlaceImageResult | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const params = new URLSearchParams({ name: trimmed });
    if (city?.trim()) params.set('city', city.trim());
    if (country?.trim()) params.set('country', country.trim());
    const resp = await fetch(`${API_BASE}/places/image?${params}`);
    if (resp.status === 404) return null;
    if (!resp.ok) {
        throw new Error(
            `/places/image failed: ${resp.status} ${resp.statusText}`,
        );
    }
    const body = (await resp.json()) as PlaceImageResponseRaw;
    return {
        imageUrl: body.image_url,
        photographerName: body.photographer_name,
        photographerUrl: body.photographer_url,
        source: body.source,
    };
};
