import { useQuery } from '@tanstack/react-query';

/**
 * Scrape place info out of an arbitrary pasted URL (a hotel / booking /
 * restaurant page that ISN'T a Google Maps or Yelp link — those the
 * smart-entry parser handles directly). The backend fetches the page and
 * reads its own schema.org JSON-LD (then OpenGraph / <title>), so the
 * name + street address + coords come from the page's structured data —
 * free, no Google Places call.
 *
 * Cached 24h (a booking page's structured data is effectively static for
 * our purposes). Returns `null` when nothing extractable came back; the
 * smart-entry watcher then falls back to its "couldn't read that link"
 * nudge.
 */
const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface ExtractedPlace {
    name: string | null;
    streetAddress: string | null;
    city: string | null;
    region: string | null;
    /** Raw `addressCountry` — may be a name ("Panama") or a 2-letter ISO
     *  code ("PA"). Callers that gate on country should treat a scraped
     *  result as trusted rather than string-compare this. */
    country: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    imageUrl: string | null;
}

interface ExtractedPlaceRaw {
    name: string | null;
    street_address: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    postal_code: string | null;
    latitude: number | null;
    longitude: number | null;
    image_url: string | null;
    source: string | null;
}

const toPlace = (r: ExtractedPlaceRaw): ExtractedPlace => ({
    name: r.name,
    streetAddress: r.street_address,
    city: r.city,
    region: r.region,
    country: r.country,
    postalCode: r.postal_code,
    latitude: r.latitude,
    longitude: r.longitude,
    imageUrl: r.image_url,
});

const fetchExtractLink = async (
    url: string,
): Promise<ExtractedPlace | null> => {
    const params = new URLSearchParams({ url });
    const resp = await fetch(
        `${API_BASE}/places/extract-link?${params.toString()}`,
    );
    if (!resp.ok) return null;
    const body = (await resp.json()) as { result: ExtractedPlaceRaw | null };
    return body.result ? toPlace(body.result) : null;
};

export const useExtractLink = (
    url: string,
    options: { enabled?: boolean } = {},
) => {
    const { enabled = true } = options;
    const trimmed = url.trim();
    return useQuery<ExtractedPlace | null>({
        queryKey: ['extract-link', trimmed],
        queryFn: () => fetchExtractLink(trimmed),
        enabled: enabled && trimmed.length > 0,
        staleTime: 24 * 60 * 60 * 1000,
        retry: 0,
    });
};
