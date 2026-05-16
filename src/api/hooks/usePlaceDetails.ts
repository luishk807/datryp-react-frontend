import { useQuery } from '@tanstack/react-query';
import { fetchPlaceDetails } from 'api/placeRecommendationsApi';
import type { PlaceDetailsResult } from 'types';

/**
 * Enriched detail-page info (foods, places-to-visit, weather, worst-time)
 * for one specific place in a previously-cached search.
 *
 * Backend caches the result inline on the place_results row, so a repeat
 * detail-page view doesn't burn OpenAI tokens. We cache hard on the client
 * too — once loaded, the details don't change.
 *
 * Pass `ready=false` while the upstream `/place-recommendations` query is
 * still in flight — `/place-details` reads from a row that
 * `/place-recommendations` creates, so on a direct deep-link the details
 * call would race ahead and 404. Defaults to true to keep the legacy
 * "fire as soon as you have a query" behavior when the caller is sure
 * the cache row already exists.
 */
export const usePlaceDetails = (query: string, index: number, ready = true) =>
    useQuery<PlaceDetailsResult>({
        queryKey: ['place-details', query.trim().toLowerCase(), index],
        queryFn: () => fetchPlaceDetails(query, index),
        enabled:
            ready &&
            query.trim().length > 0 &&
            Number.isInteger(index) &&
            index >= 0,
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
