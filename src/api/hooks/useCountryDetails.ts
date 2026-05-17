import { useQuery } from '@tanstack/react-query';
import { fetchCountryDetails } from 'api/countryDetailsApi';
import type { CountryDetailsResult } from 'types';

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
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
};
