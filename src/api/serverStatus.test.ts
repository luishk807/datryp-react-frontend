import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    markServerReachable,
    markServerUnreachable,
    getServerStatus,
    subscribeServerStatus,
    isNetworkError,
    checkServerHealth,
} from './serverStatus';

// The store is a module-level singleton — reset it to the optimistic default
// before each test so shared state never leaks across cases.
beforeEach(() => {
    markServerReachable();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('markServerUnreachable / markServerReachable', () => {
    it('stays reachable after a single failure (below threshold)', () => {
        markServerUnreachable();
        expect(getServerStatus()).toBe('reachable');
    });

    it('flips to unreachable only after FAILURE_THRESHOLD (2) failures', () => {
        markServerUnreachable();
        markServerUnreachable();
        expect(getServerStatus()).toBe('unreachable');
    });

    it('markServerReachable resets the count and status', () => {
        markServerUnreachable();
        markServerUnreachable();
        expect(getServerStatus()).toBe('unreachable');
        markServerReachable();
        expect(getServerStatus()).toBe('reachable');
        // Count was reset, so one more failure should not re-trip the wall.
        markServerUnreachable();
        expect(getServerStatus()).toBe('reachable');
    });
});

describe('subscribeServerStatus', () => {
    it('notifies listeners on a status change and stops after unsubscribe', () => {
        const listener = vi.fn();
        const unsub = subscribeServerStatus(listener);
        // Two failures cross the threshold -> one status change -> one emit.
        markServerUnreachable();
        markServerUnreachable();
        expect(listener).toHaveBeenCalledTimes(1);

        unsub();
        markServerReachable();
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not emit when the status does not actually change', () => {
        const listener = vi.fn();
        const unsub = subscribeServerStatus(listener);
        // Already reachable -> reaching again is a no-op.
        markServerReachable();
        expect(listener).not.toHaveBeenCalled();
        unsub();
    });
});

describe('isNetworkError', () => {
    it('is true for a TypeError (fetch rejection)', () => {
        expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    });

    it('is true for Error messages that name a network failure', () => {
        expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
        expect(isNetworkError(new Error('NetworkError when attempting'))).toBe(
            true
        );
        expect(isNetworkError(new Error('fetch failed'))).toBe(true);
        expect(isNetworkError(new Error('Load failed'))).toBe(true);
    });

    it('is false for an HTTP error that carries a .response (server answered)', () => {
        const clientError = Object.assign(new Error('boom'), {
            response: { status: 500 },
        });
        expect(isNetworkError(clientError)).toBe(false);
        // Plain object shaped like graphql-request ClientError.
        expect(isNetworkError({ response: { status: 404 } })).toBe(false);
    });

    it('is false for a generic Error with no network-ish message', () => {
        expect(isNetworkError(new Error('something else'))).toBe(false);
    });

    it('is false for null, undefined, a string, and a plain object', () => {
        expect(isNetworkError(null)).toBe(false);
        expect(isNetworkError(undefined)).toBe(false);
        expect(isNetworkError('Failed to fetch')).toBe(false);
        expect(isNetworkError({ foo: 1 })).toBe(false);
    });
});

describe('checkServerHealth', () => {
    it('marks reachable and returns true on an ok response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
        markServerUnreachable();
        markServerUnreachable();
        expect(getServerStatus()).toBe('unreachable');

        const ok = await checkServerHealth();
        expect(ok).toBe(true);
        expect(getServerStatus()).toBe('reachable');
    });

    it('marks reachable but returns false on a non-ok response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
        const ok = await checkServerHealth();
        expect(ok).toBe(false);
        // Any HTTP answer means the server is up.
        expect(getServerStatus()).toBe('reachable');
    });

    it('marks unreachable and returns false when the fetch rejects', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
        );
        // Two failed probes cross the threshold.
        const first = await checkServerHealth(50);
        const second = await checkServerHealth(50);
        expect(first).toBe(false);
        expect(second).toBe(false);
        expect(getServerStatus()).toBe('unreachable');
    });
});
