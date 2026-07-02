import type { QueryClient } from '@tanstack/react-query';
import { fetchPlaceRecommendations } from 'api/placeRecommendationsApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';
import { activeLang } from 'i18n';

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

/** react-query key for a suggestions search — must match `useSearchPlaces`
 *  EXACTLY, including the trailing active-language segment. `useSearchPlaces`
 *  appends `activeLang()` (results are generated + cached per language); if we
 *  omit it here the keys differ and the prefetch silently misses — the strip
 *  refetches from cold on open, which is the very lag this pre-warm exists to
 *  hide. */
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
    activeLang(),
];

/**
 * Pre-warm a suggestions strip so it's instant when the user reaches it.
 * No-op without a country. `kind: 'suggestion'` is quota-exempt, so this
 * never trips the free-tier paywall.
 *
 * Topic-agnostic: pass the SAME `topic` + `limit` the live `PlaceSuggestions`
 * renders with so the cache keys line up. Defaults to the activity strip
 * ("top things to do"); the hotel form passes its own topic so the "Suggested
 * hotels" list is warm before the user drills into the check-in step (which
 * otherwise cold-loads a slow OpenAI round-trip — see the hotel skeleton lag).
 */
export const prefetchSuggestions = (
    queryClient: QueryClient,
    {
        country,
        city,
        topic = ACTIVITY_SUGGESTIONS_TOPIC,
        limit = ACTIVITY_SUGGESTIONS_LIMIT,
    }: {
        country?: string;
        city?: string;
        topic?: string;
        limit?: number;
    },
): void => {
    const trimmedCountry = country?.trim();
    if (!trimmedCountry) return;
    const query = buildSuggestionsQuery({ topic, country, city });
    void queryClient.prefetchQuery({
        queryKey: suggestionsQueryKey(query, limit, trimmedCountry),
        queryFn: () =>
            fetchPlaceRecommendations(query, limit, trimmedCountry, 'suggestion'),
        ...STATIC_DETAIL_CACHE,
    });
};

/**
 * Pre-warm the Add-Activity place ("things to do") suggestions for a
 * destination. Thin wrapper over `prefetchSuggestions` with the default
 * topic — kept as a named export so the existing call sites read clearly.
 */
export const prefetchActivitySuggestions = (
    queryClient: QueryClient,
    country?: string,
    city?: string,
): void => prefetchSuggestions(queryClient, { country, city });
