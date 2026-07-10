import { describe, it, expect } from 'vitest';
import type { Activity, ItineraryDay, TripState } from 'types';
import { isDayEmpty, findEmptyDays } from './emptyDays';

const activity = (id: number): Activity => ({ id } as Activity);

const day = (id: number, date: string | undefined, nActivities: number): ItineraryDay =>
    ({
        id,
        date,
        activities: Array.from({ length: nActivities }, (_, i) => activity(i)),
    } as ItineraryDay);

const trip = (destinations: unknown): TripState =>
    ({ destinations } as unknown as TripState);

describe('isDayEmpty', () => {
    it('is true for null / undefined', () => {
        expect(isDayEmpty(null)).toBe(true);
        expect(isDayEmpty(undefined)).toBe(true);
    });

    it('is true when activities is missing', () => {
        expect(isDayEmpty({ id: 1, date: '2026-01-01' } as unknown as ItineraryDay)).toBe(true);
    });

    it('is true for a zero-length activities array', () => {
        expect(isDayEmpty(day(1, '2026-01-01', 0))).toBe(true);
    });

    it('is false when the day has at least one activity', () => {
        expect(isDayEmpty(day(1, '2026-01-01', 2))).toBe(false);
    });
});

describe('findEmptyDays', () => {
    it('returns an empty array for null / undefined trips', () => {
        expect(findEmptyDays(null)).toEqual([]);
        expect(findEmptyDays(undefined)).toEqual([]);
    });

    it('returns an empty array when there are no destinations', () => {
        expect(findEmptyDays(trip([]))).toEqual([]);
        expect(findEmptyDays(trip(undefined))).toEqual([]);
    });

    it('collects the dates of empty days and skips filled ones', () => {
        const t = trip([
            {
                itinerary: [
                    day(1, '2026-01-01', 0),
                    day(2, '2026-01-02', 1),
                    day(3, '2026-01-03', 0),
                ],
            },
        ]);
        expect(findEmptyDays(t)).toEqual(['2026-01-01', '2026-01-03']);
    });

    it('skips days without a date', () => {
        const t = trip([
            {
                itinerary: [day(1, undefined, 0), day(2, '2026-01-02', 0)],
            },
        ]);
        expect(findEmptyDays(t)).toEqual(['2026-01-02']);
    });

    it('handles a destination with a missing itinerary', () => {
        const t = trip([{ itinerary: undefined }, { itinerary: [day(1, '2026-02-01', 0)] }]);
        expect(findEmptyDays(t)).toEqual(['2026-02-01']);
    });

    it('walks destinations in order, chronological within each', () => {
        const t = trip([
            { itinerary: [day(1, '2026-01-01', 0)] },
            { itinerary: [day(2, '2026-02-01', 0), day(3, '2026-02-02', 1)] },
        ]);
        expect(findEmptyDays(t)).toEqual(['2026-01-01', '2026-02-01']);
    });
});
