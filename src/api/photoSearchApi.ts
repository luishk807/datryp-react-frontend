/**
 * Wrapper for the Python backend's `/photo-search` endpoint.
 *
 * Fallback path for places / cities whose primary `image_url` is null
 * — typically older cached recommendations from before Unsplash was
 * wired, or transient Unsplash misses that got persisted. The
 * frontend hits this on demand from PlaceHero so the hero never
 * defaults to the gray placeholder when an Unsplash photo is
 * actually available for that name.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface PhotoSearchResult {
    imageUrl: string;
    photographerName: string | null;
    photographerUrl: string | null;
}

interface PhotoSearchResponseRaw {
    image_url: string;
    photographer_name: string | null;
    photographer_url: string | null;
}

export const fetchPhotoSearch = async (
    query: string
): Promise<PhotoSearchResult | null> => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    const params = new URLSearchParams({ q: trimmed });
    const resp = await fetch(`${API_BASE}/photo-search?${params}`);
    if (resp.status === 404) return null;
    if (!resp.ok) {
        throw new Error(
            `/photo-search failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as PhotoSearchResponseRaw;
    return {
        imageUrl: body.image_url,
        photographerName: body.photographer_name,
        photographerUrl: body.photographer_url,
    };
};
