import { useQuery } from '@tanstack/react-query';
import { fetchPlaceRecommendations } from 'api/placeRecommendationsApi';
import { isQueryBlockedError } from 'api/moderationError';
import { isSearchQuotaExceededError } from 'api/searchQuotaError';
import type { PlaceRecommendationsResult } from 'types';

/**
 * AI-curated place results for a free-text query. Backend caches by
 * normalized (query, country) pair, so repeated identical searches don't
 * burn OpenAI tokens — and a country scope keeps Spain trips from suggesting
 * the Eiffel Tower. Client cache key mirrors the backend's namespacing.
 *
 * Gated on a non-empty query so the hook can be mounted on a page that may
 * not yet have a query param.
 */
export const useSearchPlaces = (
    query: string,
    limit = 2,
    country?: string,
    // 'suggestion' calls are exempt from the free-tier quota (auto-fired
    // browsing aids); explicit searches default to 'search'.
    kind: 'search' | 'suggestion' = 'search'
) => {
    const trimmedCountry = country?.trim() ?? '';
    return useQuery<PlaceRecommendationsResult>({
        queryKey: [
            'place-recommendations',
            query.trim().toLowerCase(),
            limit,
            trimmedCountry.toLowerCase(),
            kind,
        ],
        queryFn: () =>
            fetchPlaceRecommendations(
                query,
                limit,
                trimmedCountry || undefined,
                kind
            ),
        enabled: query.trim().length > 0,
        staleTime: 60 * 60 * 1000,
        // Don't retry our gated errors — same input will fail the same way
        // and just wastes another network round-trip.
        retry: (failureCount, error) => {
            if (isQueryBlockedError(error) || isSearchQuotaExceededError(error)) {
                return false;
            }
            return failureCount < 1;
        },
    });
};
