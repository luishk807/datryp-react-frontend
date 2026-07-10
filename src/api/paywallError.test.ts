import { describe, it, expect } from 'vitest';
import { TripCapReachedError, isTripCapReachedError } from './paywallError';

describe('TripCapReachedError', () => {
    it('derives a default message from the count and cap', () => {
        const err = new TripCapReachedError({ currentCount: 3, cap: 3 });
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(TripCapReachedError);
        expect(err.name).toBe('TripCapReachedError');
        expect(err.currentCount).toBe(3);
        expect(err.cap).toBe(3);
        expect(err.blocked).toBe(true);
        expect(err.message).toBe('Trip limit reached (3/3).');
    });

    it('uses a supplied message override', () => {
        const err = new TripCapReachedError({
            currentCount: 5,
            cap: 2,
            message: 'Upgrade to add more trips',
        });
        expect(err.message).toBe('Upgrade to add more trips');
        expect(err.currentCount).toBe(5);
        expect(err.cap).toBe(2);
    });
});

describe('isTripCapReachedError', () => {
    it('is true for a TripCapReachedError instance', () => {
        expect(
            isTripCapReachedError(
                new TripCapReachedError({ currentCount: 1, cap: 1 })
            )
        ).toBe(true);
    });

    it('is false for a plain Error, null, undefined, and a look-alike object', () => {
        expect(isTripCapReachedError(new Error('nope'))).toBe(false);
        expect(isTripCapReachedError(null)).toBe(false);
        expect(isTripCapReachedError(undefined)).toBe(false);
        expect(isTripCapReachedError({ currentCount: 1, cap: 1 })).toBe(false);
    });
});
