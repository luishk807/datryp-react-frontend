import { useQuery } from "@tanstack/react-query";
import {
    fetchCityQuick,
    fetchCountryQuick,
    type DestinationProse,
} from "api/quickDetailsApi";
import { STATIC_DETAIL_CACHE } from "api/queryClient";

/**
 * Fast narrative-only prose for the progressive loading phase. Fired in
 * parallel with the full `useCityDetails` / `useCountryDetails` query, but
 * resolves in a fraction of the time, so the page can show the "about" text
 * while the heavy sections fill in. Same 1h staleTime as the full query, and
 * the same gating, so a warm city returns instantly from the backend cache.
 */
export const useCityQuick = (
    name: string,
    country: string,
    code: string,
    enabled: boolean
) => {
    const trimmedName = name.trim();
    const trimmedCountry = country.trim();
    const trimmedCode = code.trim().toUpperCase();
    return useQuery<DestinationProse>({
        queryKey: ["city-quick", trimmedName, trimmedCode],
        queryFn: () =>
            fetchCityQuick(trimmedName, trimmedCountry, trimmedCode),
        enabled:
            enabled &&
            trimmedName.length > 0 &&
            trimmedCountry.length > 0 &&
            trimmedCode.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};

export const useCountryQuick = (code: string, enabled: boolean) => {
    const trimmedCode = code.trim().toUpperCase();
    return useQuery<DestinationProse>({
        queryKey: ["country-quick", trimmedCode],
        queryFn: () => fetchCountryQuick(trimmedCode),
        enabled: enabled && trimmedCode.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};
