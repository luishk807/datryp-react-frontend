import { useQuery } from '@tanstack/react-query';
import {
    searchAirports,
    type AirportsSearchResult,
} from 'api/airportsApi';

/**
 * Live airport search. Pass the input value; the hook hits
 * `/airports/search?q=...` and returns ranked matches. Disabled when
 * the query is empty so we don't burn requests on initial mount.
 *
 * Cache is 24 hours — the underlying airports catalog only changes
 * when the seed script runs, which is rare.
 */
export const useAirports = (query: string) => {
    const trimmed = query.trim();
    return useQuery<AirportsSearchResult>({
        queryKey: ['airports', 'search', trimmed.toLowerCase()],
        queryFn: () => searchAirports(trimmed),
        enabled: trimmed.length >= 1,
        staleTime: 24 * 60 * 60 * 1000,
        retry: 1,
    });
};
