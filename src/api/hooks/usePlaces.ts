import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';

const PLACES_QUERY = gql`
    query Places($query: String!, $limit: Int) {
        places(query: $query, limit: $limit) {
            id
            kind
            name
            countryCode
            countryName
            population
            latitude
            longitude
        }
    }
`;

export type PlaceKind = 'city' | 'country';

export interface PlaceResult {
    /** Wire ID is `"<kind>:<uuid>"`. Keep the prefix so React keys stay
     *  unique when cities and countries share UUID namespaces. */
    id: string;
    kind: PlaceKind;
    name: string;
    countryCode: string;
    countryName: string;
    population: number | null;
    latitude: number | null;
    longitude: number | null;
}

interface QueryResult {
    places: PlaceResult[];
}

/**
 * Unified place autocomplete: cities + countries in one resolver.
 *
 * Backend ranks countries before cities (when both match), then orders
 * cities by population descending. Empty `query` returns no rows.
 *
 * Callers should debounce keystrokes upstream (the SearchBar already
 * does this) — every keystroke is one DB query.
 */
export const usePlaces = (
    query: string,
    options?: { enabled?: boolean; limit?: number }
) => {
    const trimmed = query.trim();
    const limit = options?.limit ?? 10;

    return useQuery({
        queryKey: ['places', 'search', trimmed, limit],
        queryFn: async () => {
            const data = await pythonGqlClient.request<QueryResult>(
                PLACES_QUERY,
                { query: trimmed, limit }
            );
            return data.places;
        },
        enabled: options?.enabled ?? trimmed.length > 0,
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });
};
