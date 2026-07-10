import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    useFriends,
    useMyFriendRequests,
    useRespondToFriendRequest,
    useCancelFriendRequest,
    useResendFriendRequest,
    useUnfriend,
} from './useFriends';

// Friends domain lives on the PYTHON GraphQL backend (port 8000) and is
// auth-gated — queries only fire when a JWT is present in storage.
const pythonGql = graphql.link('http://localhost:8000/graphql');
const TOKEN_KEY = 'datryp:python-auth-token';

beforeEach(() => {
    localStorage.setItem(TOKEN_KEY, 'test-token');
});
afterEach(() => {
    localStorage.removeItem(TOKEN_KEY);
});

const FRIEND = { id: 'f1', email: 'ada@example.com', name: 'Ada' };

describe('useFriends', () => {
    it('unwraps the `friends` list when signed in', async () => {
        server.use(
            pythonGql.query('Friends', () =>
                HttpResponse.json({ data: { friends: [FRIEND] } })
            )
        );
        const { result } = renderHookWithProviders(() => useFriends());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([FRIEND]);
    });

    it('is disabled (no request) when logged out', () => {
        localStorage.removeItem(TOKEN_KEY);
        const { result } = renderHookWithProviders(() => useFriends());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled when `enabled: false` even with a token', () => {
        const { result } = renderHookWithProviders(() =>
            useFriends({ enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('surfaces a GraphQL error', async () => {
        server.use(
            pythonGql.query('Friends', () =>
                HttpResponse.json({ errors: [{ message: 'boom' }] })
            )
        );
        const { result } = renderHookWithProviders(() => useFriends());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useMyFriendRequests', () => {
    it('unwraps the `myFriendRequests` list', async () => {
        const requests = [
            {
                id: 'r1',
                direction: 'incoming',
                status: 'pending',
                createdAt: '2026-01-01T00:00:00Z',
                otherUser: FRIEND,
            },
        ];
        server.use(
            pythonGql.query('MyFriendRequests', () =>
                HttpResponse.json({ data: { myFriendRequests: requests } })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useMyFriendRequests()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(requests);
    });

    it('is disabled (no request) when logged out', () => {
        localStorage.removeItem(TOKEN_KEY);
        const { result } = renderHookWithProviders(() =>
            useMyFriendRequests()
        );
        expect(result.current.fetchStatus).toBe('idle');
    });
});

describe('useRespondToFriendRequest', () => {
    it('forwards vars, returns the row, and invalidates friends + requests', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.mutation('RespondToFriendRequest', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({
                    data: {
                        respondToFriendRequest: {
                            id: 'r1',
                            status: 'accepted',
                        },
                    },
                });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useRespondToFriendRequest(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync({
                requestId: 'r1',
                accept: true,
            });
        });

        await waitFor(() =>
            expect(result.current.data).toEqual({
                id: 'r1',
                status: 'accepted',
            })
        );
        expect(variables).toEqual({ requestId: 'r1', accept: true });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['friends', 'requests'],
        });
    });
});

describe('useCancelFriendRequest', () => {
    it('returns the scalar result and invalidates friends + requests', async () => {
        server.use(
            pythonGql.mutation('CancelFriendRequest', () =>
                HttpResponse.json({ data: { cancelFriendRequest: true } })
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useCancelFriendRequest(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('r1');
        });

        await waitFor(() => expect(result.current.data).toBe(true));
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['friends', 'requests'],
        });
    });
});

describe('useResendFriendRequest', () => {
    it('returns the refreshed row and invalidates friends + requests', async () => {
        server.use(
            pythonGql.mutation('ResendFriendRequest', () =>
                HttpResponse.json({
                    data: {
                        resendFriendRequest: {
                            id: 'r1',
                            status: 'pending',
                            updatedAt: '2026-02-02T00:00:00Z',
                        },
                    },
                })
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useResendFriendRequest(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('r1');
        });

        await waitFor(() =>
            expect(result.current.data).toMatchObject({ id: 'r1' })
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['friends', 'requests'],
        });
    });
});

describe('useUnfriend', () => {
    it('forwards friendUserId and invalidates friends + requests', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.mutation('Unfriend', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({ data: { unfriend: true } });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useUnfriend(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync('f1');
        });

        await waitFor(() => expect(result.current.data).toBe(true));
        expect(variables).toEqual({ friendUserId: 'f1' });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['friends', 'requests'],
        });
    });

    it('surfaces a mutation error', async () => {
        server.use(
            pythonGql.mutation('Unfriend', () =>
                HttpResponse.json({ errors: [{ message: 'nope' }] })
            )
        );
        const { result } = renderHookWithProviders(() => useUnfriend());
        await act(async () => {
            await expect(result.current.mutateAsync('f1')).rejects.toThrow();
        });
    });
});
