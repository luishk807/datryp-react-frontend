import { describe, it, expect } from 'vitest';
import {
    SearchQuotaExceededError,
    isSearchQuotaExceededError,
} from './searchQuotaError';

describe('SearchQuotaExceededError', () => {
    it('builds a default message from used/limit and carries the payload', () => {
        const err = new SearchQuotaExceededError({
            limit: 15,
            used: 15,
            resetsAt: '2026-07-11T00:00:00Z',
        });
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe('SearchQuotaExceededError');
        expect(err.message).toBe('Daily AI search limit reached (15/15).');
        expect(err.limit).toBe(15);
        expect(err.used).toBe(15);
        expect(err.resetsAt).toBe('2026-07-11T00:00:00Z');
        expect(err.quotaExceeded).toBe(true);
    });

    it('honors an explicit message and defaults resetsAt to null', () => {
        const err = new SearchQuotaExceededError({
            limit: 10,
            used: 12,
            message: 'Slow down!',
        });
        expect(err.message).toBe('Slow down!');
        expect(err.resetsAt).toBeNull();
    });

    it('type guard matches only its own instances', () => {
        const err = new SearchQuotaExceededError({ limit: 1, used: 1 });
        expect(isSearchQuotaExceededError(err)).toBe(true);
        expect(isSearchQuotaExceededError(new Error('nope'))).toBe(false);
        expect(isSearchQuotaExceededError(null)).toBe(false);
        expect(isSearchQuotaExceededError({ quotaExceeded: true })).toBe(false);
    });
});
