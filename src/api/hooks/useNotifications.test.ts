import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    useNotifications,
    useUnreadNotificationCount,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from './useNotifications';

// Notifications live on the PYTHON GraphQL backend (port 8000), auth-gated.
const pythonGql = graphql.link('http://localhost:8000/graphql');
const TOKEN_KEY = 'datryp:python-auth-token';

beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'test-token');
});
afterEach(() => {
    localStorage.removeItem(TOKEN_KEY);
});

const NOTIFICATION = {
    id: 'n1',
    kind: 'trip_saved',
    tripId: 't1',
    actorUserId: 'u2',
    payload: { trip_name: 'Japan' },
    readAt: null,
    createdAt: '2026-01-01T00:00:00Z',
};

describe('useNotifications', () => {
    it('unwraps the `notifications` list and forwards unreadOnly=false by default', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.query('Notifications', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({
                    data: { notifications: [NOTIFICATION] },
                });
            })
        );
        const { result } = renderHookWithProviders(() => useNotifications());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([NOTIFICATION]);
        expect(variables).toEqual({ unreadOnly: false });
    });

    it('forwards unreadOnly=true when requested', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.query('Notifications', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({ data: { notifications: [] } });
            })
        );
        const { result } = renderHookWithProviders(() =>
            useNotifications({ unreadOnly: true })
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(variables).toEqual({ unreadOnly: true });
    });

    it('is disabled (no request) when logged out', () => {
        localStorage.removeItem(TOKEN_KEY);
        const { result } = renderHookWithProviders(() => useNotifications());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces a GraphQL error', async () => {
        server.use(
            pythonGql.query('Notifications', () =>
                HttpResponse.json({ errors: [{ message: 'boom' }] })
            )
        );
        const { result } = renderHookWithProviders(() => useNotifications());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useUnreadNotificationCount', () => {
    it('returns the scalar unread count', async () => {
        server.use(
            pythonGql.query('UnreadNotificationCount', () =>
                HttpResponse.json({ data: { unreadNotificationCount: 3 } })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useUnreadNotificationCount()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(3);
    });

    it('is disabled (no request) when logged out', () => {
        localStorage.removeItem(TOKEN_KEY);
        const { result } = renderHookWithProviders(() =>
            useUnreadNotificationCount()
        );
        expect(result.current.fetchStatus).toBe('idle');
    });
});

describe('useMarkNotificationRead', () => {
    it('forwards the id and invalidates both notification keys', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.mutation('MarkNotificationRead', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({
                    data: { markNotificationRead: true },
                });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useMarkNotificationRead(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('n1');
        });

        await waitFor(() => expect(result.current.data).toBe(true));
        expect(variables).toEqual({ id: 'n1' });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['notifications'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['notifications', 'unreadCount'],
        });
    });
});

describe('useMarkAllNotificationsRead', () => {
    it('returns the flipped count and invalidates both notification keys', async () => {
        server.use(
            pythonGql.mutation('MarkAllNotificationsRead', () =>
                HttpResponse.json({
                    data: { markAllNotificationsRead: { count: 5 } },
                })
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useMarkAllNotificationsRead(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync();
        });

        await waitFor(() =>
            expect(result.current.data).toEqual({ count: 5 })
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['notifications'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['notifications', 'unreadCount'],
        });
    });
});
