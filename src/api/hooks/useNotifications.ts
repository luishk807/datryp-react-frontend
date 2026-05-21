/**
 * In-app notifications (Phase 1a).
 *
 * - `useNotifications` — paged list (most-recent first, capped server-side).
 * - `useUnreadNotificationCount` — drives the bell badge. Polls every 60s so
 *   the dot appears without the user reloading; the bell is too low-stakes
 *   to need a websocket.
 * - `useMarkNotificationRead` — flips one row's read_at; optimistically
 *   decrements the unread cache.
 * - `useMarkAllNotificationsRead` — flips every unread row; resets the
 *   cache to zero.
 *
 * All queries are auth-gated — the backend rejects without a JWT, so we
 * skip the request entirely when there's no token rather than spamming
 * 401s.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';
import { getAuthToken } from 'api/authStorage';
import type {
    ApiNotification,
    NotificationPayload,
} from 'types/notification.types';

const NOTIFICATIONS_QUERY = gql`
    query Notifications($unreadOnly: Boolean) {
        notifications(unreadOnly: $unreadOnly) {
            id
            kind
            tripId
            actorUserId
            payload
            readAt
            createdAt
        }
    }
`;

const UNREAD_COUNT_QUERY = gql`
    query UnreadNotificationCount {
        unreadNotificationCount
    }
`;

const MARK_READ_MUTATION = gql`
    mutation MarkNotificationRead($id: ID!) {
        markNotificationRead(id: $id)
    }
`;

const MARK_ALL_READ_MUTATION = gql`
    mutation MarkAllNotificationsRead {
        markAllNotificationsRead {
            count
        }
    }
`;

const NOTIFICATIONS_KEY = ['notifications'] as const;
const UNREAD_COUNT_KEY = ['notifications', 'unreadCount'] as const;

const invalidateNotifications = (
    qc: ReturnType<typeof useQueryClient>
): void => {
    qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    qc.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
};

export const useNotifications = (options?: {
    unreadOnly?: boolean;
    enabled?: boolean;
}) => {
    const hasToken = Boolean(getAuthToken());
    const unreadOnly = options?.unreadOnly ?? false;
    return useQuery({
        queryKey: [...NOTIFICATIONS_KEY, { unreadOnly }] as const,
        queryFn: async () => {
            const data = await pythonGqlClient.request<{
                notifications: Array<
                    Omit<ApiNotification, 'payload'> & {
                        payload: NotificationPayload;
                    }
                >;
            }>(NOTIFICATIONS_QUERY, { unreadOnly });
            return data.notifications;
        },
        enabled: (options?.enabled ?? true) && hasToken,
        staleTime: 30_000,
    });
};

export const useUnreadNotificationCount = (options?: { enabled?: boolean }) => {
    const hasToken = Boolean(getAuthToken());
    return useQuery({
        queryKey: UNREAD_COUNT_KEY,
        queryFn: async () => {
            const data = await pythonGqlClient.request<{
                unreadNotificationCount: number;
            }>(UNREAD_COUNT_QUERY);
            return data.unreadNotificationCount;
        },
        enabled: (options?.enabled ?? true) && hasToken,
        staleTime: 30_000,
        // Background poll so a fresh notification surfaces without a
        // page reload. 60s is the loosest interval that still feels
        // "real-time" for typical organize-a-trip cadences.
        refetchInterval: 60_000,
        refetchIntervalInBackground: false,
    });
};

export const useMarkNotificationRead = () => {
    const qc = useQueryClient();
    return useMutation<boolean, Error, string>({
        mutationFn: async (id) => {
            const data = await pythonGqlClient.request<{
                markNotificationRead: boolean;
            }>(MARK_READ_MUTATION, { id });
            return data.markNotificationRead;
        },
        onSuccess: () => invalidateNotifications(qc),
    });
};

export const useMarkAllNotificationsRead = () => {
    const qc = useQueryClient();
    return useMutation<{ count: number }, Error, void>({
        mutationFn: async () => {
            const data = await pythonGqlClient.request<{
                markAllNotificationsRead: { count: number };
            }>(MARK_ALL_READ_MUTATION);
            return data.markAllNotificationsRead;
        },
        onSuccess: () => invalidateNotifications(qc),
    });
};
