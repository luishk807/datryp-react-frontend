import { describe, it, expect } from 'vitest';
import { TRIP_BASIC } from 'constants';
import type { Activity, Destination, ItineraryDay, TripState } from 'types';
import { remapTripDatesToRange } from './remapTripDates';

const makeActivity = (name: string): Activity => ({ id: Math.random(), name });

const makeDay = (date: string, activities: Activity[] = []): ItineraryDay => ({
    id: Math.floor(Math.random() * 1e6),
    date,
    activities,
});

const makeDest = (overrides: Partial<Destination> = {}): Destination => ({
    id: 1,
    country: { id: 1, name: 'Japan', code: 'JP' },
    itinerary: [],
    ...overrides,
});

const singleType = { id: TRIP_BASIC.SINGLE.id, name: 'Single', route: '/single', steps: TRIP_BASIC.SINGLE.steps };
const multiType = { id: TRIP_BASIC.MULTIPLE.id, name: 'Multiple', route: '/multiple', steps: TRIP_BASIC.MULTIPLE.steps };

const makeTrip = (overrides: Partial<TripState> = {}): TripState => ({
    type: singleType,
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    destinations: [
        makeDest({
            itinerary: [
                makeDay('2026-07-01', [makeActivity('A')]),
                makeDay('2026-07-02', [makeActivity('B')]),
                makeDay('2026-07-03', [makeActivity('C')]),
            ],
        }),
    ],
    ...overrides,
});

const dayNames = (trip: TripState): string[][] =>
    (trip.destinations[0]?.itinerary ?? []).map((d) => d.activities.map((a) => a.name ?? ''));

describe('remapTripDatesToRange — guard clauses', () => {
    it('returns the trip unchanged when startDate is missing', () => {
        const trip = makeTrip({ startDate: undefined });
        expect(remapTripDatesToRange(trip, '2026-07-01')).toBe(trip);
    });

    it('returns the trip unchanged when endDate is missing', () => {
        const trip = makeTrip({ endDate: undefined });
        expect(remapTripDatesToRange(trip, '2026-07-01')).toBe(trip);
    });

    it('returns a multi-destination trip untouched', () => {
        const trip = makeTrip({ type: multiType });
        expect(remapTripDatesToRange(trip, '2026-07-01')).toBe(trip);
    });

    it('returns the trip unchanged when there is no first destination', () => {
        const trip = makeTrip({ destinations: [] });
        expect(remapTripDatesToRange(trip, '2026-07-01')).toBe(trip);
    });
});

describe('remapTripDatesToRange — shift', () => {
    it('carries every day (and its activities) forward when the start moves', () => {
        const trip = makeTrip({ startDate: '2026-07-05', endDate: '2026-07-07' });
        const out = remapTripDatesToRange(trip, '2026-07-01');
        expect(out.destinations[0].itinerary.map((d) => d.date)).toEqual([
            '2026-07-05',
            '2026-07-06',
            '2026-07-07',
        ]);
        expect(dayNames(out)).toEqual([['A'], ['B'], ['C']]);
    });

    it('no-ops the shift (delta 0) when the start did not change', () => {
        const trip = makeTrip();
        const out = remapTripDatesToRange(trip, '2026-07-01');
        expect(out.destinations[0].itinerary.map((d) => d.date)).toEqual([
            '2026-07-01',
            '2026-07-02',
            '2026-07-03',
        ]);
        expect(dayNames(out)).toEqual([['A'], ['B'], ['C']]);
    });

    it('treats a missing oldStartDate as a zero delta (just re-fits by date)', () => {
        const trip = makeTrip();
        const out = remapTripDatesToRange(trip, undefined);
        expect(out.destinations[0].itinerary.map((d) => d.date)).toEqual([
            '2026-07-01',
            '2026-07-02',
            '2026-07-03',
        ]);
        expect(dayNames(out)).toEqual([['A'], ['B'], ['C']]);
    });
});

describe('remapTripDatesToRange — fit', () => {
    it('pads new dates with empty days when the range is extended via the end date', () => {
        const trip = makeTrip({ endDate: '2026-07-05' });
        const out = remapTripDatesToRange(trip, '2026-07-01');
        const it = out.destinations[0].itinerary;
        expect(it.map((d) => d.date)).toEqual([
            '2026-07-01',
            '2026-07-02',
            '2026-07-03',
            '2026-07-04',
            '2026-07-05',
        ]);
        expect(dayNames(out)).toEqual([['A'], ['B'], ['C'], [], []]);
        // Padded days get a generated numeric id.
        expect(typeof it[3].id).toBe('number');
    });

    it('drops shifted days that fall outside a shortened range', () => {
        const trip = makeTrip({ endDate: '2026-07-02' });
        const out = remapTripDatesToRange(trip, '2026-07-01');
        expect(out.destinations[0].itinerary.map((d) => d.date)).toEqual([
            '2026-07-01',
            '2026-07-02',
        ]);
        expect(dayNames(out)).toEqual([['A'], ['B']]);
    });

    it('collapses to a single day when the range is inverted (end before start)', () => {
        const trip = makeTrip({ startDate: '2026-07-03', endDate: '2026-07-01' });
        const out = remapTripDatesToRange(trip, '2026-07-01');
        const it = out.destinations[0].itinerary;
        // enumerateDates returns just the (shifted) start; the day shifted +2
        // to 2026-07-03 lands on it and keeps its activity.
        expect(it).toHaveLength(1);
        expect(it[0].date).toBe('2026-07-03');
        expect(it[0].activities.map((a) => a.name)).toEqual(['A']);
    });

    it('produces an all-empty itinerary when no shifted day matches the new range', () => {
        const trip = makeTrip({
            startDate: '2026-08-01',
            endDate: '2026-08-02',
            destinations: [
                makeDest({
                    itinerary: [makeDay('2026-07-01', [makeActivity('A')])],
                }),
            ],
        });
        // Start moved +31 days -> the single day lands on 2026-08-01 and is kept.
        const out = remapTripDatesToRange(trip, '2026-07-01');
        expect(out.destinations[0].itinerary.map((d) => d.date)).toEqual([
            '2026-08-01',
            '2026-08-02',
        ]);
        expect(dayNames(out)).toEqual([['A'], []]);
    });

    it('handles a destination with no itinerary by padding empty days', () => {
        const trip = makeTrip({
            destinations: [makeDest({ itinerary: undefined as never })],
        });
        const out = remapTripDatesToRange(trip, '2026-07-01');
        expect(out.destinations[0].itinerary.map((d) => d.date)).toEqual([
            '2026-07-01',
            '2026-07-02',
            '2026-07-03',
        ]);
        expect(dayNames(out)).toEqual([[], [], []]);
    });
});
