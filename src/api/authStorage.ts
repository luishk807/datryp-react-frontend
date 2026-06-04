/**
 * Persistent storage for the Python backend's JWT access token.
 *
 * Persisted in localStorage so a refresh keeps the user signed in.
 * `pythonGqlClient` reads from here on every request so its
 * Authorization header always reflects the latest token.
 */

import type { MeResponse } from 'api/authApi';

const STORAGE_KEY = 'datryp:python-auth-token';
// Last successful /auth/me payload, cached so the session survives a cold
// offline reload: useCurrentUser seeds `placeholderData` from here, which
// keeps the user "signed in" (and past AuthGate) with no network. Only
// trusted when a token is also present; cleared on logout / 401.
const CACHED_ME_KEY = 'datryp:python-auth-me';

const subscribers = new Set<(token: string | null) => void>();

export const getAuthToken = (): string | null => {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
};

export const setAuthToken = (token: string | null): void => {
    try {
        if (token) {
            localStorage.setItem(STORAGE_KEY, token);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Storage quota or privacy mode — fall through.
    }
    subscribers.forEach((fn) => fn(token));
};

export const subscribeAuthToken = (
    fn: (token: string | null) => void
): (() => void) => {
    subscribers.add(fn);
    return () => {
        subscribers.delete(fn);
    };
};

/**
 * Read the cached /auth/me payload. Returns null when no token is stored
 * (a cached user without a token would be a stale "ghost" login), or when
 * nothing has been cached yet.
 */
export const getCachedMe = (): MeResponse | null => {
    try {
        if (!getAuthToken()) return null;
        const raw = localStorage.getItem(CACHED_ME_KEY);
        return raw ? (JSON.parse(raw) as MeResponse) : null;
    } catch {
        return null;
    }
};

/** Persist (or clear, on null) the last successful /auth/me payload. */
export const setCachedMe = (me: MeResponse | null): void => {
    try {
        if (me) {
            localStorage.setItem(CACHED_ME_KEY, JSON.stringify(me));
        } else {
            localStorage.removeItem(CACHED_ME_KEY);
        }
    } catch {
        // Storage quota or privacy mode — fall through.
    }
};
