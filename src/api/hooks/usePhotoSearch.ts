import { useQuery } from '@tanstack/react-query';
import {
    fetchPhotoSearch,
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
