import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    fetchCityDetails,
    fetchCityFacts,
    fetchCityLists,
    fetchCityProse,
    type CityDetailsSlice,
} from 'api/cityDetailsApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';
import type { CityDetails, CityDetailsResult, CitySummary } from 'types';

/**
 * Enriched, city-level travel info. Backend caches the result in
 * `city_details` keyed by `<city>--<country_code>` slug — first request
 * per unique city burns one OpenAI + one Unsplash call, every subsequent
 * view is instant. 1h client-side cache (city facts barely change).
 *
 * Gated on all three params being present so refreshes from a partial
 * URL don't fire a 422.
 */
export const useCityDetails = (name: string, country: string, code: string) => {
    const trimmedName = name.trim();
    const trimmedCountry = country.trim();
    const trimmedCode = code.trim().toUpperCase();
    return useQuery<CityDetailsResult>({
        queryKey: ['city-details', trimmedName, trimmedCode],
        queryFn: () =>
            fetchCityDetails(trimmedName, trimmedCountry, trimmedCode),
        enabled:
            trimmedName.length > 0 &&
            trimmedCountry.length > 0 &&
            trimmedCode.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};

// --- Progressive "slice" hooks ---------------------------------------------
// The city page fetches prose / lists / facts independently so a cold city
// paints in phases instead of blocking on the slowest OpenAI call. Each maps
// to one backend slice endpoint; `useCityDetailsProgressive` fans all three
// out in parallel and merges them as they land.

const sliceEnabled = (name: string, country: string, code: string) =>
    name.trim().length > 0 &&
    country.trim().length > 0 &&
    code.trim().length >= 2;

export const useCityProse = (name: string, country: string, code: string) =>
    useQuery({
        queryKey: ['city-prose', name.trim(), code.trim().toUpperCase()],
        queryFn: () => fetchCityProse(name.trim(), country.trim(), code.trim()),
        enabled: sliceEnabled(name, country, code),
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });

export const useCityLists = (name: string, country: string, code: string) =>
    useQuery({
        queryKey: ['city-lists', name.trim(), code.trim().toUpperCase()],
        queryFn: () => fetchCityLists(name.trim(), country.trim(), code.trim()),
        enabled: sliceEnabled(name, country, code),
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });

export const useCityFacts = (name: string, country: string, code: string) =>
    useQuery({
        queryKey: ['city-facts', name.trim(), code.trim().toUpperCase()],
        queryFn: () => fetchCityFacts(name.trim(), country.trim(), code.trim()),
        enabled: sliceEnabled(name, country, code),
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });

export interface ProgressiveCityDetails {
    city: CitySummary | undefined;
    /** Merged slice data — fields fill in as prose/lists/facts resolve. */
    details: Partial<CityDetails>;
    /** First-paint gate: the page can render its frame + header once prose
     *  lands (the city summary + "about" text live in this slice). */
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    listsLoading: boolean;
    factsLoading: boolean;
}

/**
 * Fan out the three city-detail slices in parallel and expose them merged.
 * Prose gates first paint (it carries the city summary + hero image);
 * lists and facts stream into their sections as they arrive, each of which
 * renders its own skeleton until then.
 */
export const useCityDetailsProgressive = (
    name: string,
    country: string,
    code: string
): ProgressiveCityDetails => {
    const prose = useCityProse(name, country, code);
    const lists = useCityLists(name, country, code);
    const facts = useCityFacts(name, country, code);

    const details = useMemo<Partial<CityDetails>>(
        () => ({
            ...(prose.data?.details ?? {}),
            ...((lists.data as CityDetailsSlice | undefined) ?? {}),
            ...((facts.data as CityDetailsSlice | undefined) ?? {}),
        }),
        [prose.data, lists.data, facts.data]
    );

    return {
        city: prose.data?.city,
        details,
        isLoading: prose.isLoading,
        isError: prose.isError,
        error: prose.error,
        listsLoading: lists.isLoading,
        factsLoading: facts.isLoading,
    };
};
