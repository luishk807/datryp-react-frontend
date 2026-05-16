/**
 * Fetch wrapper for `GET /hero-images` on the Python backend.
 * REST (not GraphQL) — see backend `app/routers/hero_images.py`.
 */
import type { HeroImage } from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface HeroImageResponseItem {
    id: string;
    city: string;
    image_url: string;
    source: string;
    photographer_name: string;
    photographer_url: string;
}

interface HeroImagesResponse {
    items: HeroImageResponseItem[];
}

const toHeroImage = (raw: HeroImageResponseItem): HeroImage => ({
    id: raw.id,
    city: raw.city,
    imageUrl: raw.image_url,
    source: raw.source,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
});

export const fetchHeroImages = async (): Promise<HeroImage[]> => {
    const resp = await fetch(`${API_BASE}/hero-images`);
    if (!resp.ok) {
        throw new Error(`/hero-images failed: ${resp.status} ${resp.statusText}`);
    }
    const body = (await resp.json()) as HeroImagesResponse;
    return body.items.map(toHeroImage);
};
