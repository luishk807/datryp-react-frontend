import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import { meFixture, tokenFixture } from '../../test/fixtures/auth';
import { getAuthToken, setAuthToken, setCachedMe } from '../authStorage';
import { queryKeys } from '../queryKeys';
import {
    useCurrentUser,
    useLogin,
    useSignup,
    useGoogleSignin,
    useLogout,
} from './useAuth';

const BASE = 'http://localhost:8000';

// These tests drive the REAL token store — no authStorage mock. Reset both
// the token and the cached /auth/me (which seeds `placeholderData`) so no
// case leaks a signed-in state into the next.
beforeEach(() => {
    setAuthToken(null);
    setCachedMe(null);
});

describe('useCurrentUser', () => {
    it('resolves to null with no request when no token is stored', async () => {
        const { result } = renderHookWithProviders(() => useCurrentUser());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('fetches /auth/me when a token is present', async () => {
        setAuthToken('test-token');
        server.use(
            http.get(`${BASE}/auth/me`, () => HttpResponse.json(meFixture))
        );
        const { result } = renderHookWithProviders(() => useCurrentUser());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.email).toBe(meFixture.email);
    });

    it('clears a stale token and returns null on a 401', async () => {
        setAuthToken('stale-token');
        server.use(
            http.get(
                `${BASE}/auth/me`,
                () => new HttpResponse(null, { status: 401 })
            )
        );
        const { result } = renderHookWithProviders(() => useCurrentUser());
        await waitFor(() => expect(result.current.data).toBeNull());
        expect(getAuthToken()).toBeNull();
    });
});

describe('useLogin', () => {
    it('stores the token and invalidates the current-user query', async () => {
        let body: unknown;
        server.use(
            http.post(`${BASE}/auth/login`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(tokenFixture);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useLogin(), {
            client,
        });
        await act(async () => {
            await result.current.mutateAsync({
                email: 'a@b.com',
                password: 'secret',
            });
        });
        expect(body).toEqual({ email: 'a@b.com', password: 'secret' });
        // onSuccess (token store + invalidation) lands a tick after mutateAsync
        // resolves (v5) — poll for the token, by which point invalidate ran too.
        await waitFor(() =>
            expect(getAuthToken()).toBe(tokenFixture.access_token)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.currentUser,
        });
    });
});

describe('useSignup', () => {
    it('stores the token on a successful signup', async () => {
        server.use(
            http.post(`${BASE}/auth/signup`, () =>
                HttpResponse.json(tokenFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useSignup());
        await act(async () => {
            await result.current.mutateAsync({
                email: 'new@example.com',
                password: 'secret',
                birth_year: 1990,
                confirm_age_13_plus: true,
            });
        });
        await waitFor(() =>
            expect(getAuthToken()).toBe(tokenFixture.access_token)
        );
    });
});

describe('useGoogleSignin', () => {
    it('stores the token on a successful Google sign-in', async () => {
        server.use(
            http.post(`${BASE}/auth/google`, () =>
                HttpResponse.json(tokenFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useGoogleSignin());
        await act(async () => {
            await result.current.mutateAsync('google-credential');
        });
        await waitFor(() =>
            expect(getAuthToken()).toBe(tokenFixture.access_token)
        );
    });
});

describe('useLogout', () => {
    it('clears the token and resets the current-user + auth-gated caches', () => {
        setAuthToken('a-token');
        const client = makeTestQueryClient();
        const removeSpy = vi.spyOn(client, 'removeQueries');
        const { result } = renderHookWithProviders(() => useLogout(), {
            client,
        });
        act(() => {
            result.current();
        });
        expect(getAuthToken()).toBeNull();
        expect(client.getQueryData(queryKeys.currentUser)).toBeNull();
        expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['friends'] });
        expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['trips'] });
    });
});
