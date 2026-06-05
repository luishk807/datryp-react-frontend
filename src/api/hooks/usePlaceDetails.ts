import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    fetchPlaceDetails,
    fetchPlaceFacts,
    fetchPlaceLists,
    fetchPlaceProse,
    type PlaceDetailsSlice,
} from 'api/placeRecommendationsApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';
import type { PlaceDetails, PlaceDetailsResult } from 'types';

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
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });

// --- Progressive "slice" hooks ---------------------------------------------
// The place page slices the DETAIL enrichment (step 2 of the waterfall) into
// prose / lists / facts so it streams in phases once the recommendation (step
// 1) resolves. All three share the same `ready` gate as `usePlaceDetails` —
// `/place-details*` reads the row `/place-recommendations` creates, so firing
// before the search lands 404s on a direct deep-link.

const sliceEnabled = (query: string, index: number, ready: boolean) =>
    ready &&
    query.trim().length > 0 &&
    Number.isInteger(index) &&
    index >= 0;

export const usePlaceProse = (query: string, index: number, ready = true) =>
    useQuery<PlaceDetailsSlice>({
        queryKey: ['place-prose', query.trim().toLowerCase(), index],
        queryFn: () => fetchPlaceProse(query, index),
        enabled: sliceEnabled(query, index, ready),
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });

export const usePlaceLists = (query: string, index: number, ready = true) =>
    useQuery<PlaceDetailsSlice>({
        queryKey: ['place-lists', query.trim().toLowerCase(), index],
        queryFn: () => fetchPlaceLists(query, index),
        enabled: sliceEnabled(query, index, ready),
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });

export const usePlaceFacts = (query: string, index: number, ready = true) =>
    useQuery<PlaceDetailsSlice>({
        queryKey: ['place-facts', query.trim().toLowerCase(), index],
        queryFn: () => fetchPlaceFacts(query, index),
        enabled: sliceEnabled(query, index, ready),
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });

export interface ProgressivePlaceDetails {
    /** Merged slice data — fields fill in as prose/lists/facts resolve. */
    details: Partial<PlaceDetails>;
    /** True until ANY slice has data. The page already shows the recommended
     *  place's header from step 1, so this only gates the enrichment body. */
    isLoading: boolean;
    /** Combined error — true if any slice failed. Kept for callers that still
     *  want an all-or-nothing signal; the place page now uses the per-slice
     *  flags below so one failed slice only blanks the sections it feeds. */
    isError: boolean;
    error: unknown;
    proseLoading: boolean;
    listsLoading: boolean;
    factsLoading: boolean;
    /** Per-slice error flags. A section reads the flag of the slice that
     *  actually provides its data, so a failed `facts` call (currency, safety,
     *  visa…) doesn't hide the `prose` description or the `lists` extras. */
    proseError: boolean;
    listsError: boolean;
    factsError: boolean;
}

/**
 * Fan out the three place-detail slices in parallel and expose them merged.
 * Gated on `ready` (the recommendation having resolved). Each section renders
 * its own skeleton until its slice lands, so the body streams in phases.
 */
export const usePlaceDetailsProgressive = (
    query: string,
    index: number,
    ready = true
): ProgressivePlaceDetails => {
    const prose = usePlaceProse(query, index, ready);
    const lists = usePlaceLists(query, index, ready);
    const facts = usePlaceFacts(query, index, ready);

    const details = useMemo<Partial<PlaceDetails>>(
        () => ({
            ...(prose.data ?? {}),
            ...(lists.data ?? {}),
            ...(facts.data ?? {}),
        }),
        [prose.data, lists.data, facts.data]
    );

    return {
        details,
        isLoading: prose.isLoading && lists.isLoading && facts.isLoading,
        isError: prose.isError || lists.isError || facts.isError,
        error: prose.error ?? lists.error ?? facts.error,
        proseLoading: prose.isLoading,
        listsLoading: lists.isLoading,
        factsLoading: facts.isLoading,
        proseError: prose.isError,
        listsError: lists.isError,
        factsError: facts.isError,
    };
};
