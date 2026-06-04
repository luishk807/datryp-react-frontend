/**
 * React Query hooks for the Python backend auth flow.
 *
 * - `useCurrentUser` — the authenticated user from /auth/me. Returns null
 *   when no token is stored. Invalidated on login/signup/logout.
 * - `useLogin` / `useSignup` — mutations that persist the returned token
 *   and refresh `useCurrentUser`.
 * - `useLogout` — clears the token and the query cache.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchMe,
    googleSignin as googleSigninRequest,
    login as loginRequest,
    signup as signupRequest,
    type LoginPayload,
    type MeResponse,
    type SignupPayload,
    type TokenResponse,
} from 'api/authApi';
import {
    getAuthToken,
    getCachedMe,
    setAuthToken,
    setCachedMe,
} from 'api/authStorage';
import { queryKeys } from 'api/queryKeys';

export const useCurrentUser = () =>
    useQuery<MeResponse | null>({
        queryKey: queryKeys.currentUser,
        queryFn: async () => {
            if (!getAuthToken()) {
                setCachedMe(null);
                return null;
            }
            try {
                const me = await fetchMe();
                // Cache for offline: keeps the user signed in past AuthGate
                // on a cold reload with no network (see placeholderData).
                setCachedMe(me);
                return me;
            } catch (err) {
                // 401 → token is stale/invalid. Clear it so the rest of the
                // app doesn't render an "almost logged in" state.
                if ((err as { status?: number }).status === 401) {
                    setAuthToken(null);
                    setCachedMe(null);
                    return null;
                }
                throw err;
            }
        },
        // Offline cold-start: the query is paused (no network) so `data`
        // falls back to the last cached /auth/me, keeping the session alive.
        // Online, the real fetch resolves and replaces this as before.
        placeholderData: () => getCachedMe() ?? undefined,
        staleTime: 5 * 60 * 1000,
    });

export const useLogin = () => {
    const queryClient = useQueryClient();
    return useMutation<TokenResponse, Error, LoginPayload>({
        mutationFn: loginRequest,
        onSuccess: (data) => {
            setAuthToken(data.access_token);
            queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
        },
    });
};

export const useSignup = () => {
    const queryClient = useQueryClient();
    return useMutation<TokenResponse, Error, SignupPayload>({
        mutationFn: signupRequest,
        onSuccess: (data) => {
            setAuthToken(data.access_token);
            queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
        },
    });
};

export const useGoogleSignin = () => {
    const queryClient = useQueryClient();
    return useMutation<TokenResponse, Error, string>({
        mutationFn: googleSigninRequest,
        onSuccess: (data) => {
            setAuthToken(data.access_token);
            queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
        },
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    return () => {
        setAuthToken(null);
        setCachedMe(null);
        queryClient.setQueryData(queryKeys.currentUser, null);
        // Drop any auth-gated cached data (friends, myItineraries, etc).
        queryClient.removeQueries({ queryKey: ['friends'] });
        queryClient.removeQueries({ queryKey: ['trips'] });
    };
};
