import { useQuery } from '@tanstack/react-query';
import { fetchPlaceRecommendations } from 'api/placeRecommendationsApi';
import type { PlaceRecommendationsResult } from 'types';

/**
 * AI-curated place results for a free-text query. Backend caches by normalized
 * query, so repeated identical searches don't burn OpenAI tokens — but we also
 * cache aggressively on the client to keep navigations cheap.
 *
 * Gated on a non-empty query so the hook can be mounted on a page that may
 * not yet have a query param.
 */
export const useSearchPlaces = (query: string, limit = 2) =>
    useQuery<PlaceRecommendationsResult>({
        queryKey: ['place-recommendations', query.trim().toLowerCase(), limit],
        queryFn: () => fetchPlaceRecommendations(query, limit),
        enabled: query.trim().length > 0,
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
