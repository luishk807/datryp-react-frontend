import { useQuery } from '@tanstack/react-query';
import { searchAirports } from 'api/airportsApi';

/**
 * Resolve a free-text destination (a trip's city or country, e.g.
 * "Maldives" or "Panama City") to its best-match airport IATA via the
 * static `/airports/search` catalog. Used to seed the flight-search "To"
 * field when the trip has no flight yet to read a destination airport from.
 *
 * Returns the top-ranked airport's code, or `null` when nothing matches.
 * Best-effort: the catalog ranks by relevance, so the first hit for a
 * country query is its primary/most-prominent airport in our seed. The
 * user can always refine or swap the field.
 *
 * Disabled (no fetch) when `enabled` is false or the query is too short —
 * keeps us from burning a request when a flight-derived airport already
 * covers the default.
 */
export const useDestinationAirport = (
    query: string | undefined,
    enabled = true,
) => {
    const q = (query ?? '').trim();
    return useQuery<string | null>({
        queryKey: ['destination-airport', q.toLowerCase()],
        queryFn: async () => {
            const res = await searchAirports(q, 1);
            return res.items[0]?.iataCode ?? null;
        },
        enabled: enabled && q.length >= 2,
        // The catalog is static across deploys — cache hard.
        staleTime: 24 * 60 * 60 * 1000,
        retry: 0,
    });
};
