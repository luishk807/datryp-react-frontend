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
 */
export const usePlaceDetails = (query: string, index: number) =>
    useQuery<PlaceDetailsResult>({
        queryKey: ['place-details', query.trim().toLowerCase(), index],
        queryFn: () => fetchPlaceDetails(query, index),
        enabled: query.trim().length > 0 && Number.isInteger(index) && index >= 0,
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
