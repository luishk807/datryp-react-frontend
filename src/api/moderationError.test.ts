import { describe, it, expect } from 'vitest';
import { QueryBlockedError, isQueryBlockedError } from './moderationError';

describe('QueryBlockedError', () => {
    it('carries the category, a fixed name, and the blocked flag', () => {
        const err = new QueryBlockedError('adult');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(QueryBlockedError);
        expect(err.name).toBe('QueryBlockedError');
        expect(err.category).toBe('adult');
        expect(err.blocked).toBe(true);
        expect(err.message).toBe('Query blocked: adult');
    });
});

describe('isQueryBlockedError', () => {
    it('is true for a QueryBlockedError instance', () => {
        expect(isQueryBlockedError(new QueryBlockedError('violence'))).toBe(
            true
        );
    });

    it('is false for a plain Error, null, undefined, and a look-alike object', () => {
        expect(isQueryBlockedError(new Error('nope'))).toBe(false);
        expect(isQueryBlockedError(null)).toBe(false);
        expect(isQueryBlockedError(undefined)).toBe(false);
        expect(isQueryBlockedError({ blocked: true, category: 'x' })).toBe(
            false
        );
    });
});
