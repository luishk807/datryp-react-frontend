import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND } from 'constants';
import type { Activity, SingleDestination } from 'types';
import { tripCardDays, tripCardPlaces, tripCardPlannedPercent } from './tripCardStats';

type CardDay = { date: string; activities?: Activity[] };

const act = (kind?: string): Activity => ({ id: 1, kind } as Activity);

const card = (opts: {
    startDate?: string;
    endDate?: string;
    intenaryDates?: CardDay[];
}): SingleDestination =>
    ({
        startDate: opts.startDate,
        endDate: opts.endDate,
        intenaryDates: opts.intenaryDates,
    } as unknown as SingleDestination);

describe('tripCardDays', () => {
    it('returns the inclusive date span when start and end are valid', () => {
        expect(tripCardDays(card({ startDate: '2026-01-01', endDate: '2026-01-05' }))).toBe(5);
    });

    it('returns 1 when start equals end', () => {
        expect(tripCardDays(card({ startDate: '2026-01-05', endDate: '2026-01-05' }))).toBe(1);
    });

    it('falls back to the itinerary-day count when the dates are empty / invalid strings', () => {
        expect(
            tripCardDays(
                card({
                    startDate: '',
                    endDate: '',
                    intenaryDates: [
                        { date: '2026-01-01' },
                        { date: '2026-01-02' },
                        { date: '2026-01-03' },
                    ],
                }),
            ),
        ).toBe(3);
    });

    it('treats undefined dates as today, yielding a span of 1', () => {
        // moment(undefined) resolves to "now", so both bounds parse as valid
        // and land on the same day -> span of 1 (not the itinerary fallback).
        expect(tripCardDays(card({}))).toBe(1);
    });

    it('falls back to the itinerary-day count when the span is not positive (end before start)', () => {
        expect(
            tripCardDays(
                card({
                    startDate: '2026-01-05',
                    endDate: '2026-01-01',
                    intenaryDates: [{ date: '2026-01-05' }, { date: '2026-01-06' }],
                }),
            ),
        ).toBe(2);
    });

    it('returns 0 when the dates are empty strings and there are no itinerary days', () => {
        expect(tripCardDays(card({ startDate: '', endDate: '' }))).toBe(0);
    });
});

describe('tripCardPlaces', () => {
    it('counts PLACE-kind activities and treats a missing kind as PLACE', () => {
        const data = card({
            intenaryDates: [
                { date: '2026-01-01', activities: [act(ACTIVITY_KIND.PLACE), act(undefined)] },
                { date: '2026-01-02', activities: [act(ACTIVITY_KIND.PLACE)] },
            ],
        });
        expect(tripCardPlaces(data)).toBe(3);
    });

    it('excludes notes, flights and transport rows', () => {
        const data = card({
            intenaryDates: [
                {
                    date: '2026-01-01',
                    activities: [
                        act(ACTIVITY_KIND.PLACE),
                        act(ACTIVITY_KIND.NOTE),
                        act(ACTIVITY_KIND.FLIGHT),
                        act(ACTIVITY_KIND.TRAIN),
                        act(ACTIVITY_KIND.HOTEL_CHECKIN),
                    ],
                },
            ],
        });
        expect(tripCardPlaces(data)).toBe(1);
    });

    it('is 0 for no itinerary days', () => {
        expect(tripCardPlaces(card({}))).toBe(0);
    });

    it('handles a day with no activities array', () => {
        const data = card({ intenaryDates: [{ date: '2026-01-01' }] });
        expect(tripCardPlaces(data)).toBe(0);
    });
});

describe('tripCardPlannedPercent', () => {
    it('is 0 when there are no itinerary days', () => {
        expect(tripCardPlannedPercent(card({}))).toBe(0);
    });

    it('is 100 when every day has a non-note activity', () => {
        const data = card({
            intenaryDates: [
                { date: '2026-01-01', activities: [act(ACTIVITY_KIND.PLACE)] },
                { date: '2026-01-02', activities: [act(ACTIVITY_KIND.FLIGHT)] },
            ],
        });
        expect(tripCardPlannedPercent(data)).toBe(100);
    });

    it('does not count days whose only activity is a note, that are empty, or that lack an activities array', () => {
        const data = card({
            intenaryDates: [
                { date: '2026-01-01', activities: [act(ACTIVITY_KIND.PLACE)] },
                { date: '2026-01-02', activities: [act(ACTIVITY_KIND.NOTE)] },
                { date: '2026-01-03', activities: [] },
                { date: '2026-01-04' }, // no activities array at all
            ],
        });
        // 1 filled out of 4 -> 25.
        expect(tripCardPlannedPercent(data)).toBe(25);
    });

    it('rounds to the nearest whole percent', () => {
        const data = card({
            intenaryDates: [
                { date: '2026-01-01', activities: [act(ACTIVITY_KIND.PLACE)] },
                { date: '2026-01-02', activities: [act(ACTIVITY_KIND.PLACE)] },
                { date: '2026-01-03', activities: [] },
            ],
        });
        // 2 of 3 -> 66.67 -> 67.
        expect(tripCardPlannedPercent(data)).toBe(67);
    });
});
