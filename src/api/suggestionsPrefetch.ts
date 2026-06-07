import type { QueryClient } from '@tanstack/react-query';
import { fetchPlaceRecommendations } from 'api/placeRecommendationsApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';

/**
 * Single source of truth for the place-suggestions recommender query, shared
 * by the live `PlaceSuggestions` strip and the Add-Activity pre-warm so both
 * land on the SAME react-query cache key (any drift would make the pre-warm a
 * silent no-op).
 */

/** Default topic for activity suggestions ("things to do"). */
export const ACTIVITY_SUGGESTIONS_TOPIC = 'top things to do';
/** Count the Add-Activity Suggestions strip requests (PlaceForm `limit={10}`). */
export const ACTIVITY_SUGGESTIONS_LIMIT = 10;

export interface SuggestionsQueryInput {
    topic?: string;
    bias?: string;
    country?: string;
    city?: string;
    /** Bumped by the strip's shuffle button; 0 for the initial (pre-warmable) set. */
    shuffleNonce?: number;
}

/** Build the recommender query string. Prefers a `city, country` geo scope and
 *  falls back to country-only — exactly mirroring PlaceSuggestions. */
export const buildSuggestionsQuery = ({
    topic = ACTIVITY_SUGGESTIONS_TOPIC,
    bias,
    country,
    city,
    shuffleNonce = 0,
}: SuggestionsQueryInput): string => {
    const trimmedCountry = country?.trim();
    const trimmedCity = city?.trim();
    const geoScope = trimmedCity
        ? `${trimmedCity}, ${trimmedCountry}`
        : trimmedCountry;
    return [
        topic,
        bias?.trim() || '',
        geoScope ? `in ${geoScope}` : '',
        shuffleNonce ? `(shuffle ${shuffleNonce})` : '',
    ]
        .filter(Boolean)
        .join(' ');
};

/** react-query key for a suggestions search — must match `useSearchPlaces`. */
export const suggestionsQueryKey = (
    query: string,
    limit: number,
    country: string,
) => [
    'place-recommendations',
    query.trim().toLowerCase(),
    limit,
    country.trim().toLowerCase(),
    'suggestion',
];

/**
 * Pre-warm the Add-Activity place suggestions for a destination so the
 * Suggestions strip is instant when the user opens it. No-op without a
 * country. `kind: 'suggestion'` is quota-exempt, so this never trips the
 * free-tier paywall.
 */
export const prefetchActivitySuggestions = (
    queryClient: QueryClient,
    country?: string,
    city?: string,
): void => {
    const trimmedCountry = country?.trim();
    if (!trimmedCountry) return;
    const limit = ACTIVITY_SUGGESTIONS_LIMIT;
    const query = buildSuggestionsQuery({ country, city });
    void queryClient.prefetchQuery({
        queryKey: suggestionsQueryKey(query, limit, trimmedCountry),
        queryFn: () =>
            fetchPlaceRecommendations(query, limit, trimmedCountry, 'suggestion'),
        ...STATIC_DETAIL_CACHE,
    });
};
