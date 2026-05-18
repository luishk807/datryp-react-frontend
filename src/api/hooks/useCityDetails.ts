import { useQuery } from '@tanstack/react-query';
import { fetchCityDetails } from 'api/cityDetailsApi';
import type { CityDetailsResult } from 'types';

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
        staleTime: 60 * 60 * 1000,
        retry: 1,
    });
};
