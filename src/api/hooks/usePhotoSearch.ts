import { useQuery } from '@tanstack/react-query';
import {
    fetchPhotoSearch,
    fetchPhotoGallery,
    type PhotoSearchResult,
} from 'api/photoSearchApi';

/**
 * On-demand Unsplash photo fallback for surfaces whose primary image
 * is null. Disabled (and returns no result) when `enabled` is false or
 * `query` is empty — letting callers gate the lookup on
 * `!primaryImageUrl` without conditional hooks.
 *
 * Cached aggressively (1h) since the same place will likely produce
 * the same fallback hit; one tab open with a missing hero shouldn't
 * keep re-querying Unsplash on every render.
 */
export const usePhotoSearch = (
    query: string,
    options: { enabled?: boolean } = {}
) => {
    const { enabled = true } = options;
    return useQuery<PhotoSearchResult | null>({
        queryKey: ['photo-search', query],
        queryFn: () => fetchPhotoSearch(query),
        enabled: enabled && query.trim().length > 0,
        staleTime: 60 * 60 * 1000,
        // Don't retry on 404 (no photo found) — that's a stable state.
        retry: 1,
    });
};

/**
 * Up to `count` Unsplash photos for a query — the place-detail hero gallery
 * (one main + a few thumbnails to swap between). One backend request, cached
 * 1h client-side; same cost as the single hero photo. Gated like
 * `usePhotoSearch` so callers can mount it without conditional hooks.
 */
export const usePhotoGallery = (
    query: string,
    count = 4,
    options: { enabled?: boolean } = {}
) => {
    const { enabled = true } = options;
    const trimmed = query.trim();
    return useQuery<PhotoSearchResult[]>({
        queryKey: ['photo-gallery', trimmed, count],
        queryFn: () => fetchPhotoGallery(trimmed, count),
        enabled: enabled && trimmed.length > 0,
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
};
