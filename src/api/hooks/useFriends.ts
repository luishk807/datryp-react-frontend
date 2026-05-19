/**
 * Friends domain hooks against the Python backend (auth-gated, symmetric).
 *
 * - `useFriends` — accepted friends (existing query, kept as-is)
 * - `useMyFriendRequests` — pending requests in both directions
 * - `useRespondToFriendRequest` — accept/reject an incoming request
 * - `useCancelFriendRequest` — cancel an outgoing request
 * - `useUnfriend` — remove an accepted friendship
 *
 * The mutations invalidate BOTH the requests and friends query keys on
 * success — when you accept a request, that request disappears AND a new
 * friend appears, and both lists need to refetch.
 *
 * Queries are disabled when the user isn't logged in so we don't pump
 * unauthenticated requests to a 401-returning endpoint.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

const MY_FRIEND_REQUESTS_QUERY = gql`
    query MyFriendRequests {
        myFriendRequests {
            id
            direction
            status
            createdAt
            otherUser {
                id
                email
                name
            }
        }
    }
`;

const RESPOND_MUTATION = gql`
    mutation RespondToFriendRequest($requestId: ID!, $accept: Boolean!) {
        respondToFriendRequest(requestId: $requestId, accept: $accept) {
            id
            status
        }
    }
`;

const CANCEL_MUTATION = gql`
    mutation CancelFriendRequest($requestId: ID!) {
        cancelFriendRequest(requestId: $requestId)
    }
`;

const RESEND_MUTATION = gql`
    mutation ResendFriendRequest($requestId: ID!) {
        resendFriendRequest(requestId: $requestId) {
            id
            status
            updatedAt
        }
    }
`;

const UNFRIEND_MUTATION = gql`
    mutation Unfriend($friendUserId: ID!) {
        unfriend(friendUserId: $friendUserId)
    }
`;

export interface ApiFriend {
    id: string;
    email: string;
    name: string | null;
}

export type FriendRequestDirection = 'incoming' | 'outgoing';

export interface ApiFriendRequest {
    id: string;
    direction: FriendRequestDirection;
    status: string;
    createdAt: string;
    otherUser: ApiFriend;
}

const FRIENDS_KEY = ['friends'] as const;
const REQUESTS_KEY = ['friends', 'requests'] as const;

const invalidateFriendsState = (
    qc: ReturnType<typeof useQueryClient>
): void => {
    qc.invalidateQueries({ queryKey: FRIENDS_KEY });
    qc.invalidateQueries({ queryKey: REQUESTS_KEY });
};

export const useFriends = (options?: { enabled?: boolean }) => {
    const hasToken = Boolean(getAuthToken());
    return useQuery({
        queryKey: FRIENDS_KEY,
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

export const useMyFriendRequests = (options?: { enabled?: boolean }) => {
    const hasToken = Boolean(getAuthToken());
    return useQuery({
        queryKey: REQUESTS_KEY,
        queryFn: async () => {
            const data = await pythonGqlClient.request<{
                myFriendRequests: ApiFriendRequest[];
            }>(MY_FRIEND_REQUESTS_QUERY);
            return data.myFriendRequests;
        },
        enabled: (options?.enabled ?? true) && hasToken,
        staleTime: 30_000,
    });
};

export const useRespondToFriendRequest = () => {
    const qc = useQueryClient();
    return useMutation<
        { id: string; status: string },
        Error,
        { requestId: string; accept: boolean }
    >({
        mutationFn: async ({ requestId, accept }) => {
            const data = await pythonGqlClient.request<{
                respondToFriendRequest: { id: string; status: string };
            }>(RESPOND_MUTATION, { requestId, accept });
            return data.respondToFriendRequest;
        },
        onSuccess: () => invalidateFriendsState(qc),
    });
};

export const useCancelFriendRequest = () => {
    const qc = useQueryClient();
    return useMutation<boolean, Error, string>({
        mutationFn: async (requestId) => {
            const data = await pythonGqlClient.request<{
                cancelFriendRequest: boolean;
            }>(CANCEL_MUTATION, { requestId });
            return data.cancelFriendRequest;
        },
        onSuccess: () => invalidateFriendsState(qc),
    });
};

export const useResendFriendRequest = () => {
    const qc = useQueryClient();
    return useMutation<
        { id: string; status: string; updatedAt: string },
        Error,
        string
    >({
        mutationFn: async (requestId) => {
            const data = await pythonGqlClient.request<{
                resendFriendRequest: {
                    id: string;
                    status: string;
                    updatedAt: string;
                };
            }>(RESEND_MUTATION, { requestId });
            return data.resendFriendRequest;
        },
        // Refresh the requests list — updatedAt changed, which the UI uses
        // to grey out the button until the cooldown elapses next save.
        onSuccess: () => invalidateFriendsState(qc),
    });
};

export const useUnfriend = () => {
    const qc = useQueryClient();
    return useMutation<boolean, Error, string>({
        mutationFn: async (friendUserId) => {
            const data = await pythonGqlClient.request<{ unfriend: boolean }>(
                UNFRIEND_MUTATION,
                { friendUserId }
            );
            return data.unfriend;
        },
        onSuccess: () => invalidateFriendsState(qc),
    });
};
