import { useQuery } from '@tanstack/react-query';
import {
    fetchCountryFacts,
    type CountryFactsResult,
} from 'api/countryFactsApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';

/**
 * Curated per-country reference facts (emergency / power / time zone), keyed by
 * ISO-2 code. The data is static and language-independent, so it's keyed on the
 * code alone and cached hard. Disabled on a blank / too-short code so it never
 * fires a 422 on a cold URL. Mirrors `useEssentialApps`.
 */
export const useCountryFacts = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    return useQuery<CountryFactsResult | null>({
        queryKey: ['country-facts', trimmed],
        queryFn: () => fetchCountryFacts(trimmed),
        enabled: trimmed.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};
