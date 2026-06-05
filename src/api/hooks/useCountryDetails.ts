import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    fetchCountryDetails,
    fetchCountryFacts,
    fetchCountryLists,
    fetchCountryProse,
    type CountryDetailsSlice,
} from 'api/countryDetailsApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';
import type {
    CountryDetails,
    CountryDetailsResult,
    CountrySummary,
} from 'types';

/**
 * Enriched, country-level travel info for one ISO 3166-1 alpha-2 code.
 *
 * Backend caches the result in `country_details` keyed by country UUID, so
 * the first user to view a given country burns one OpenAI call and every
 * subsequent view (across the whole user base) is instant. We cache hard on
 * the client too — country details don't change.
 *
 * Disabled until `code` is a non-empty 2-char string so refreshes from a
 * blank URL bar don't fire a 422.
 */
export const useCountryDetails = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    return useQuery<CountryDetailsResult>({
        queryKey: ['country-details', trimmed],
        queryFn: () => fetchCountryDetails(trimmed),
        enabled: trimmed.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};

// --- Progressive "slice" hooks ---------------------------------------------
// The country page fetches prose / lists / facts independently so a cold
// country paints in phases. `useCountryDetailsProgressive` fans all three out
// in parallel and merges them as they land. Mirrors the city page.

export const useCountryProse = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    return useQuery({
        queryKey: ['country-prose', trimmed],
        queryFn: () => fetchCountryProse(trimmed),
        enabled: trimmed.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};

export const useCountryLists = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    return useQuery({
        queryKey: ['country-lists', trimmed],
        queryFn: () => fetchCountryLists(trimmed),
        enabled: trimmed.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};

export const useCountryFacts = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    return useQuery({
        queryKey: ['country-facts', trimmed],
        queryFn: () => fetchCountryFacts(trimmed),
        enabled: trimmed.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};

export interface ProgressiveCountryDetails {
    country: CountrySummary | undefined;
    details: Partial<CountryDetails>;
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    listsLoading: boolean;
    factsLoading: boolean;
}

/**
 * Fan out the three country-detail slices in parallel and expose them merged.
 * Prose gates first paint (it carries the country summary + hero image);
 * lists and facts stream into their sections as they arrive, each rendering
 * its own skeleton until then.
 */
export const useCountryDetailsProgressive = (
    code: string
): ProgressiveCountryDetails => {
    const prose = useCountryProse(code);
    const lists = useCountryLists(code);
    const facts = useCountryFacts(code);

    const details = useMemo<Partial<CountryDetails>>(
        () => ({
            ...(prose.data?.details ?? {}),
            ...((lists.data as CountryDetailsSlice | undefined) ?? {}),
            ...((facts.data as CountryDetailsSlice | undefined) ?? {}),
        }),
        [prose.data, lists.data, facts.data]
    );

    return {
        country: prose.data?.country,
        details,
        isLoading: prose.isLoading,
        isError: prose.isError,
        error: prose.error,
        listsLoading: lists.isLoading,
        factsLoading: facts.isLoading,
    };
};
