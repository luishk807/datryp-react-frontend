import { useQuery } from '@tanstack/react-query';
import { searchAirports } from 'api/airportsApi';

/**
 * Resolve an IATA code (e.g. "BOS") to its city name (e.g. "Boston") via the
 * static `/airports/search` catalog. Used to scope a destination's activity /
 * hotel suggestions to the ARRIVAL CITY when the leg has no activity to infer
 * a city from yet — otherwise the strip falls back to the whole country
 * (a Boston leg suggesting "United States").
 *
 * Only an exact IATA match is trusted: a fuzzy name hit could resolve to a
 * different city than the code the user entered (or, for a train/bus leg whose
 * "airport" is really a station name, to an unrelated airport). Returns null in
 * that case so the caller keeps its country-level fallback.
 */
export const useAirportCity = (code: string | undefined) => {
    const q = (code ?? '').trim();
    return useQuery<string | null>({
        queryKey: ['airport-city', q.toUpperCase()],
        queryFn: async () => {
            const res = await searchAirports(q, 1);
            const top = res.items[0];
            if (top && top.iataCode.toUpperCase() === q.toUpperCase()) {
                return top.city?.trim() || null;
            }
            return null;
        },
        // IATA codes are 3 letters; a station name (train/bus) won't exact-match
        // and resolves to null — the desired "fall back to country" behaviour.
        enabled: q.length >= 2,
        // The catalog is static across deploys — cache hard.
        staleTime: 24 * 60 * 60 * 1000,
        retry: 0,
    });
};
