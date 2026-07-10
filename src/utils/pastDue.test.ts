import { describe, it, expect } from 'vitest';
import { TRIP_STATUS } from 'constants';
import type { TripStatus } from 'types';
import { isTripPastDue, tripEndedDaysAgo } from './pastDue';

// Local YYYY-MM-DD offset from today (avoids UTC boundary flakiness that a
// toISOString().slice() would introduce near midnight).
const isoDaysFromNow = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
};

const status = (name: string): TripStatus => ({ id: 'x', name });

describe('tripEndedDaysAgo', () => {
    it('is positive for an end date in the past', () => {
        expect(tripEndedDaysAgo({ endDate: isoDaysFromNow(-3) })).toBe(3);
    });

    it('is 0 or negative for an end date today or in the future', () => {
        expect(tripEndedDaysAgo({ endDate: isoDaysFromNow(0) })).toBeLessThanOrEqual(0);
        expect(tripEndedDaysAgo({ endDate: isoDaysFromNow(5) })).toBeLessThan(0);
    });

    it('returns 0 when the end date is missing or invalid', () => {
        expect(tripEndedDaysAgo({ endDate: undefined })).toBe(0);
        expect(tripEndedDaysAgo({ endDate: 'not-a-date' })).toBe(0);
    });
});

describe('isTripPastDue', () => {
    it('is true for a Planning trip whose end date has passed', () => {
        expect(
            isTripPastDue({
                status: status(TRIP_STATUS.PLANNING),
                endDate: isoDaysFromNow(-1),
            })
        ).toBe(true);
    });

    it('is false for a Planning trip that has not ended yet', () => {
        expect(
            isTripPastDue({
                status: status(TRIP_STATUS.PLANNING),
                endDate: isoDaysFromNow(2),
            })
        ).toBe(false);
    });

    it('is false for a Confirmed trip even if its end date passed (only Planning is nudged)', () => {
        expect(
            isTripPastDue({
                status: status(TRIP_STATUS.CONFIRMED),
                endDate: isoDaysFromNow(-10),
            })
        ).toBe(false);
    });

    it('is false when the end date is invalid', () => {
        expect(
            isTripPastDue({
                status: status(TRIP_STATUS.PLANNING),
                endDate: undefined,
            })
        ).toBe(false);
    });
});
