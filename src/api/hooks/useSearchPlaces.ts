import { useQuery } from '@tanstack/react-query';
import { fetchPlaceRecommendations } from 'api/placeRecommendationsApi';
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
    country?: string
) => {
    const trimmedCountry = country?.trim() ?? '';
    return useQuery<PlaceRecommendationsResult>({
        queryKey: [
            'place-recommendations',
            query.trim().toLowerCase(),
            limit,
            trimmedCountry.toLowerCase(),
        ],
        queryFn: () =>
            fetchPlaceRecommendations(query, limit, trimmedCountry || undefined),
        enabled: query.trim().length > 0,
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
};
