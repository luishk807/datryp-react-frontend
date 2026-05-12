/**
 * Persistent storage for the Python backend's JWT access token.
 *
 * Persisted in localStorage so a refresh keeps the user signed in.
 * `pythonGqlClient` reads from here on every request so its
 * Authorization header always reflects the latest token.
 */

const STORAGE_KEY = 'datryp:python-auth-token';

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
