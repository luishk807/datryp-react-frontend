import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MeResponse } from './authApi';
import {
    getAuthToken,
    setAuthToken,
    subscribeAuthToken,
    getCachedMe,
    setCachedMe,
} from './authStorage';

const TOKEN_KEY = 'datryp:python-auth-token';
const CACHED_ME_KEY = 'datryp:python-auth-me';

const sampleMe = {
    id: 'u1',
    email: 'traveler@example.com',
    name: 'Traveler',
} as unknown as MeResponse;

beforeEach(() => {
    localStorage.clear();
});

describe('getAuthToken / setAuthToken', () => {
    it('round-trips a token through localStorage', () => {
        expect(getAuthToken()).toBeNull();
        setAuthToken('jwt-abc');
        expect(getAuthToken()).toBe('jwt-abc');
        expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-abc');
    });

    it('removes the stored token when set to null', () => {
        setAuthToken('jwt-abc');
        setAuthToken(null);
        expect(getAuthToken()).toBeNull();
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('returns null when reading localStorage throws', () => {
        setAuthToken('jwt-abc');
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('privacy mode');
        });
        expect(getAuthToken()).toBeNull();
    });

    it('still notifies subscribers when writing localStorage throws', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota exceeded');
        });
        const fn = vi.fn();
        const unsub = subscribeAuthToken(fn);
        // The write fails internally, but the pub/sub notification must fire.
        expect(() => setAuthToken('jwt-xyz')).not.toThrow();
        expect(fn).toHaveBeenCalledWith('jwt-xyz');
        unsub();
    });
});

describe('subscribeAuthToken', () => {
    it('fires the subscriber on set with the new token, then null', () => {
        const fn = vi.fn();
        const unsub = subscribeAuthToken(fn);
        setAuthToken('t1');
        setAuthToken(null);
        expect(fn).toHaveBeenNthCalledWith(1, 't1');
        expect(fn).toHaveBeenNthCalledWith(2, null);
        unsub();
    });

    it('stops firing after unsubscribe', () => {
        const fn = vi.fn();
        const unsub = subscribeAuthToken(fn);
        unsub();
        setAuthToken('t2');
        expect(fn).not.toHaveBeenCalled();
    });
});

describe('getCachedMe', () => {
    it('returns null when no token is present even if a cached blob exists', () => {
        localStorage.setItem(CACHED_ME_KEY, JSON.stringify(sampleMe));
        expect(getAuthToken()).toBeNull();
        expect(getCachedMe()).toBeNull();
    });

    it('returns the parsed payload when a token and cache both exist', () => {
        setAuthToken('jwt-abc');
        setCachedMe(sampleMe);
        expect(getCachedMe()).toEqual(sampleMe);
    });

    it('returns null when a token exists but nothing is cached', () => {
        setAuthToken('jwt-abc');
        expect(getCachedMe()).toBeNull();
    });

    it('returns null when the cached blob is unparseable JSON', () => {
        setAuthToken('jwt-abc');
        localStorage.setItem(CACHED_ME_KEY, '{not valid json');
        expect(getCachedMe()).toBeNull();
    });

    it('returns null when reading localStorage throws', () => {
        setAuthToken('jwt-abc');
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('boom');
        });
        expect(getCachedMe()).toBeNull();
    });
});

describe('setCachedMe', () => {
    it('persists then clears the cached payload', () => {
        setCachedMe(sampleMe);
        expect(localStorage.getItem(CACHED_ME_KEY)).toBe(
            JSON.stringify(sampleMe)
        );
        setCachedMe(null);
        expect(localStorage.getItem(CACHED_ME_KEY)).toBeNull();
    });

    it('swallows a localStorage write failure without throwing', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota exceeded');
        });
        expect(() => setCachedMe(sampleMe)).not.toThrow();
    });
});
