/**
 * Friends query against the Python backend (auth-gated, symmetric).
 * Disabled when the user isn't logged in so we don't pump unauthenticated
 * requests to a 401-returning endpoint.
 */

import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';
import { getAuthToken } from 'api/authStorage';

const FRIENDS_QUERY = gql`
    query Friends {
        friends {
            id
            email
            name
        }
    }
`;

export interface ApiFriend {
    id: string;
    email: string;
    name: string | null;
}

export const useFriends = (options?: { enabled?: boolean }) => {
    const hasToken = Boolean(getAuthToken());
    return useQuery({
        queryKey: ['friends'],
        queryFn: async () => {
            const data = await pythonGqlClient.request<{ friends: ApiFriend[] }>(
                FRIENDS_QUERY
            );
            return data.friends;
        },
        enabled: (options?.enabled ?? true) && hasToken,
        staleTime: 60_000,
    });
};
