import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND } from 'constants';
import type { Activity, Destination, ItineraryDay, TripState } from 'types';
import {
    tripHasRealActivities,
    sumActivityCosts,
    deriveTripStats,
    deriveAtlasRecord,
} from './tripStats';

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({ id: 1, ...overrides });

const makeDay = (activities: Activity[] = [], date = '2026-07-01'): ItineraryDay => ({
    id: 1,
    date,
    activities,
});

const makeDest = (overrides: Partial<Destination> = {}): Destination => ({
    id: 1,
    country: { id: 1, name: 'Japan', code: 'JP' },
    itinerary: [],
    ...overrides,
});

const makeTrip = (overrides: Partial<TripState> = {}): TripState => ({
    destinations: [],
    ...overrides,
});

describe('tripHasRealActivities', () => {
    it('is false with no destinations (defaults to empty)', () => {
        expect(tripHasRealActivities()).toBe(false);
        expect(tripHasRealActivities([])).toBe(false);
    });

    it('is false when only structural (flight/transport/hotel) activities exist', () => {
        const dest = makeDest({
            itinerary: [
                makeDay([
                    makeActivity({ kind: ACTIVITY_KIND.FLIGHT }),
                    makeActivity({ kind: ACTIVITY_KIND.HOTEL_CHECKIN }),
                    makeActivity({ kind: ACTIVITY_KIND.TRAIN }),
                    makeActivity({ kind: ACTIVITY_KIND.RENTAL_CAR }),
                ]),
            ],
        });
        expect(tripHasRealActivities([dest])).toBe(false);
    });

    it('is true for a place, a note, or a null-kind (back-filled to place) activity', () => {
        expect(
            tripHasRealActivities([
                makeDest({ itinerary: [makeDay([makeActivity({ kind: ACTIVITY_KIND.PLACE })])] }),
            ])
        ).toBe(true);
        // note is NOT structural, so it counts as a real activity here.
        expect(
            tripHasRealActivities([
                makeDest({ itinerary: [makeDay([makeActivity({ kind: ACTIVITY_KIND.NOTE })])] }),
            ])
        ).toBe(true);
        expect(
            tripHasRealActivities([
                makeDest({ itinerary: [makeDay([makeActivity({})])] }),
            ])
        ).toBe(true);
    });

    it('tolerates missing itinerary / activities arrays', () => {
        expect(tripHasRealActivities([makeDest({ itinerary: undefined as never })])).toBe(false);
        expect(
            tripHasRealActivities([makeDest({ itinerary: [makeDay(undefined as never)] })])
        ).toBe(false);
    });
});

describe('sumActivityCosts', () => {
    it('is 0 for empty input', () => {
        expect(sumActivityCosts()).toBe(0);
        expect(sumActivityCosts([])).toBe(0);
    });

    it('adds the arrival-flight cost plus every activity cost, coercing strings', () => {
        const dest = makeDest({
            flightInfo: { cost: '100' },
            itinerary: [
                makeDay([makeActivity({ cost: 50 }), makeActivity({ cost: '25.5' })]),
                makeDay([makeActivity({ cost: 10 })]),
            ],
        });
        expect(sumActivityCosts([dest])).toBe(185.5);
    });

    it('treats null/undefined/non-numeric costs as 0', () => {
        const dest = makeDest({
            flightInfo: undefined,
            itinerary: [
                makeDay([
                    makeActivity({ cost: undefined }),
                    makeActivity({ cost: 'abc' }),
                    makeActivity({ cost: 40 }),
                ]),
            ],
        });
        expect(sumActivityCosts([dest])).toBe(40);
    });

    it('sums across multiple destinations', () => {
        const a = makeDest({ flightInfo: { cost: 200 }, itinerary: [makeDay([makeActivity({ cost: 30 })])] });
        const b = makeDest({ flightInfo: { cost: '50' } });
        expect(sumActivityCosts([a, b])).toBe(280);
    });
});

describe('deriveTripStats', () => {
    it('handles a trip with no destinations at all', () => {
        const stats = deriveTripStats({} as TripState);
        expect(stats).toEqual({ days: 1, activities: 0, spent: 0, countries: 0 });
    });

    it('prefers the inclusive start->end span for days', () => {
        const trip = makeTrip({
            startDate: '2026-07-01',
            endDate: '2026-07-05',
            destinations: [makeDest({ itinerary: [makeDay(), makeDay()] })],
        });
        expect(deriveTripStats(trip).days).toBe(5);
    });

    it('falls back to the itinerary day count when dates are invalid', () => {
        const trip = makeTrip({
            startDate: 'not-a-date',
            endDate: 'also-bad',
            destinations: [makeDest({ itinerary: [makeDay(), makeDay(), makeDay()] })],
        });
        expect(deriveTripStats(trip).days).toBe(3);
    });

    it('keeps the itinerary count when the span would be < 1 (inverted dates)', () => {
        const trip = makeTrip({
            startDate: '2026-07-05',
            endDate: '2026-07-01',
            destinations: [makeDest({ itinerary: [makeDay(), makeDay()] })],
        });
        expect(deriveTripStats(trip).days).toBe(2);
    });

    it('counts total activities across every day and destination', () => {
        const trip = makeTrip({
            startDate: '2026-07-01',
            endDate: '2026-07-02',
            destinations: [
                makeDest({ itinerary: [makeDay([makeActivity(), makeActivity()]), makeDay([makeActivity()])] }),
                makeDest({ itinerary: [makeDay([makeActivity()])] }),
            ],
        });
        expect(deriveTripStats(trip).activities).toBe(4);
    });

    it('dedupes countries by code, falling back to name', () => {
        const trip = makeTrip({
            destinations: [
                makeDest({ country: { id: 1, name: 'Japan', code: 'JP' } }),
                makeDest({ country: { id: 2, name: 'Japan (Kyoto)', code: 'JP' } }),
                makeDest({ country: { id: 3, name: 'France' } }),
                makeDest({ country: { id: 4, name: '' } }),
            ],
        });
        expect(deriveTripStats(trip).countries).toBe(2);
    });

    it('rolls spent up through sumActivityCosts', () => {
        const trip = makeTrip({
            destinations: [makeDest({ flightInfo: { cost: 100 }, itinerary: [makeDay([makeActivity({ cost: 25 })])] })],
        });
        expect(deriveTripStats(trip).spent).toBe(125);
    });

    it('tolerates destinations with no itinerary and days with no activities', () => {
        const trip = makeTrip({
            startDate: 'bad',
            endDate: 'bad',
            destinations: [
                makeDest({ itinerary: undefined as never }),
                makeDest({ itinerary: [makeDay(undefined as never)] }),
            ],
        });
        const stats = deriveTripStats(trip);
        expect(stats.activities).toBe(0);
        expect(stats.days).toBe(1);
    });
});

describe('deriveAtlasRecord', () => {
    it('is all-zero for an empty trip', () => {
        expect(deriveAtlasRecord({} as TripState)).toEqual({ countries: 0, cities: 0, places: 0 });
    });

    it('counts only activities carrying full place identity (name + city + country)', () => {
        const trip = makeTrip({
            destinations: [
                makeDest({
                    country: { id: 1, name: 'Japan', code: 'JP' },
                    itinerary: [
                        makeDay([
                            makeActivity({ name: 'Senso-ji', placeCity: 'Tokyo', placeCountry: 'Japan' }),
                            makeActivity({ name: 'Skytree', placeCity: 'Tokyo', placeCountry: 'Japan' }),
                            // missing city -> not a place
                            makeActivity({ name: 'Note', placeCountry: 'Japan' }),
                            // missing name -> not a place
                            makeActivity({ placeCity: 'Tokyo', placeCountry: 'Japan' }),
                            // missing country -> not a place
                            makeActivity({ name: 'X', placeCity: 'Tokyo' }),
                        ]),
                    ],
                }),
            ],
        });
        expect(deriveAtlasRecord(trip)).toEqual({ countries: 1, cities: 1, places: 2 });
    });

    it('dedupes cities case-insensitively across destinations', () => {
        const trip = makeTrip({
            destinations: [
                makeDest({
                    country: { id: 1, name: 'Japan', code: 'JP' },
                    itinerary: [
                        makeDay([makeActivity({ name: 'A', placeCity: 'Tokyo', placeCountry: 'Japan' })]),
                    ],
                }),
                makeDest({
                    country: { id: 2, name: 'France', code: 'FR' },
                    itinerary: [
                        makeDay([
                            makeActivity({ name: 'B', placeCity: 'TOKYO', placeCountry: 'JAPAN' }),
                            makeActivity({ name: 'C', placeCity: 'Paris', placeCountry: 'France' }),
                        ]),
                    ],
                }),
            ],
        });
        expect(deriveAtlasRecord(trip)).toEqual({ countries: 2, cities: 2, places: 3 });
    });

    it('ignores a destination with no country name for the country count', () => {
        const trip = makeTrip({
            destinations: [makeDest({ country: { id: 1, name: '' } })],
        });
        expect(deriveAtlasRecord(trip).countries).toBe(0);
    });

    it('keys the country by name when it carries no code', () => {
        const trip = makeTrip({
            destinations: [
                makeDest({ country: { id: 1, name: 'Peru' } }),
                makeDest({ country: { id: 2, name: 'Peru' } }),
            ],
        });
        expect(deriveAtlasRecord(trip).countries).toBe(1);
    });
});
