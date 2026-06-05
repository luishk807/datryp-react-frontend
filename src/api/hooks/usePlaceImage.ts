import { useQuery } from '@tanstack/react-query';
import { fetchPlaceImage, type PlaceImageResult } from 'api/placeImageApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';

/**
 * Cache-aware hero-image fallback for a specific place. Resolves through
 * the backend's `/places/image` (cache → Unsplash → Pexels → Pixabay)
 * and persists the winner server-side, so repeat views — and other
 * users — get the same image without a fresh third-party call.
 *
 * Mirrors `usePhotoSearch`: disabled (no result) when `enabled` is false
 * or `name` is empty, so callers can gate on `!primaryImageUrl` without
 * conditional hooks. Cached 1h client-side on top of the server cache.
 */
export const usePlaceImage = (
    name: string,
    city: string | null | undefined,
    country: string | null | undefined,
    options: { enabled?: boolean } = {},
) => {
    const { enabled = true } = options;
    return useQuery<PlaceImageResult | null>({
        queryKey: ['place-image', name, city ?? '', country ?? ''],
        queryFn: () => fetchPlaceImage(name, city, country),
        enabled: enabled && name.trim().length > 0,
        ...STATIC_DETAIL_CACHE,
        // 404 = neither provider matched; a stable state, don't hammer it.
        retry: 1,
    });
};
