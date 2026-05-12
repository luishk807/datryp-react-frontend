import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';

const COUNTRIES_QUERY = gql`
    query Countries($query: String!, $limit: Int) {
        countries(query: $query, limit: $limit) {
            id
            name
            code
            local
            image
        }
    }
`;

export interface CountryResult {
    id: string;
    name: string;
    code: string;
    local: string | null;
    image: string | null;
}

interface QueryResult {
    countries: CountryResult[];
}

/**
 * Country catalog query (Python backend).
 *
 * - With a non-empty `query`: substring autocomplete (SearchBar).
 * - With an empty `query`: full catalog up to `limit` (Account dropdown).
 *
 * Callers that want autocomplete-only behavior should gate via
 * `options.enabled`. By default the hook fires whenever it's enabled.
 */
export const useCountries = (
    query: string,
    options?: { enabled?: boolean; limit?: number }
) => {
    const trimmed = query.trim();
    const limit = options?.limit ?? 10;

    return useQuery({
        queryKey: ['countries', 'search', trimmed, limit],
        queryFn: async () => {
            const data = await pythonGqlClient.request<QueryResult>(
                COUNTRIES_QUERY,
                { query: trimmed, limit }
            );
            return data.countries;
        },
        enabled: options?.enabled ?? true,
        placeholderData: keepPreviousData,
        staleTime: 60_000,
    });
};
