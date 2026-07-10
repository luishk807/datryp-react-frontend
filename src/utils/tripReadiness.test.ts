import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND } from 'constants';
import type { Activity, Destination, FlightInfo, ItineraryDay, TripState } from 'types';
import { deriveTripReadiness } from './tripReadiness';

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

const checkOk = (r: ReturnType<typeof deriveTripReadiness>, key: string): boolean =>
    r.checks.find((c) => c.key === key)!.ok;

describe('deriveTripReadiness — empty trip', () => {
    it('scores 0 with every check failing and no free days', () => {
        const r = deriveTripReadiness(makeTrip());
        expect(r.percent).toBe(0);
        expect(r.freeDays).toEqual([]);
        expect(r.checks.map((c) => c.ok)).toEqual([false, false, false, false]);
        expect(r.checks.map((c) => c.key)).toEqual(['lodging', 'activities', 'budget', 'transport']);
    });

    it('uses the "missing/not set" labels when nothing is filled', () => {
        const r = deriveTripReadiness(makeTrip());
        expect(r.checks.map((c) => c.label)).toEqual([
            'Lodging missing',
            'No activities added yet',
            'Budget not set',
            'Transportation missing',
        ]);
    });

    it('tolerates a trip with no destinations array at all', () => {
        const r = deriveTripReadiness({} as TripState);
        expect(r.percent).toBe(0);
        expect(r.freeDays).toEqual([]);
    });
});

describe('deriveTripReadiness — a fully-ready trip', () => {
    const fullTrip = makeTrip({
        budget: 1200,
        destinations: [
            makeDest({
                flightInfo: { flightNumber: 'AA100' },
                itinerary: [
                    makeDay([
                        makeActivity({ kind: ACTIVITY_KIND.HOTEL_CHECKIN }),
                        makeActivity({ kind: ACTIVITY_KIND.PLACE }),
                    ]),
                    makeDay([makeActivity({ kind: ACTIVITY_KIND.PLACE })]),
                ],
            }),
        ],
    });

    it('scores 100 with all checks passing and no free days', () => {
        const r = deriveTripReadiness(fullTrip);
        expect(r.percent).toBe(100);
        expect(r.freeDays).toEqual([]);
        expect(r.checks.every((c) => c.ok)).toBe(true);
    });

    it('uses the "added/set" labels when everything is filled', () => {
        const r = deriveTripReadiness(fullTrip);
        expect(r.checks.map((c) => c.label)).toEqual([
            'Lodging added',
            'Daily activities added',
            'Budget set',
            'Transportation added',
        ]);
    });
});

describe('deriveTripReadiness — transport detection', () => {
    it.each<[keyof FlightInfo, string]>([
        ['flightNumber', 'AA1'],
        ['carrier', 'JR'],
        ['departAirport', 'NRT'],
        ['arrivalAirport', 'HND'],
        ['departDate', '2026-07-01'],
    ])('marks transport ok when flightInfo.%s is present', (field, value) => {
        const r = deriveTripReadiness(
            makeTrip({ destinations: [makeDest({ flightInfo: { [field]: value } })] })
        );
        expect(checkOk(r, 'transport')).toBe(true);
    });

    it('does not mark transport for an empty flightInfo object', () => {
        const r = deriveTripReadiness(makeTrip({ destinations: [makeDest({ flightInfo: {} })] }));
        expect(checkOk(r, 'transport')).toBe(false);
    });

    it('marks transport ok from a transport-kind itinerary activity', () => {
        const r = deriveTripReadiness(
            makeTrip({
                destinations: [
                    makeDest({ itinerary: [makeDay([makeActivity({ kind: ACTIVITY_KIND.BUS })])] }),
                ],
            })
        );
        expect(checkOk(r, 'transport')).toBe(true);
    });
});

describe('deriveTripReadiness — activities, notes and free days', () => {
    it('excludes notes from real activities and flags note-only days as free', () => {
        const r = deriveTripReadiness(
            makeTrip({
                destinations: [
                    makeDest({
                        itinerary: [
                            makeDay([makeActivity({ kind: ACTIVITY_KIND.PLACE })]),
                            makeDay([makeActivity({ kind: ACTIVITY_KIND.NOTE })]),
                        ],
                    }),
                ],
            })
        );
        expect(checkOk(r, 'activities')).toBe(true);
        expect(r.freeDays).toEqual([2]);
    });

    it('numbers free days globally across destinations, in order', () => {
        const r = deriveTripReadiness(
            makeTrip({
                destinations: [
                    makeDest({
                        itinerary: [
                            makeDay([]),
                            makeDay([makeActivity({ kind: ACTIVITY_KIND.PLACE })]),
                        ],
                    }),
                    makeDest({ itinerary: [makeDay([])] }),
                ],
            })
        );
        // day 1 empty, day 2 filled, day 3 (second dest) empty
        expect(r.freeDays).toEqual([1, 3]);
    });

    it('counts a lodging check-in as a real activity and sets lodging', () => {
        const r = deriveTripReadiness(
            makeTrip({
                destinations: [
                    makeDest({ itinerary: [makeDay([makeActivity({ kind: ACTIVITY_KIND.HOTEL_CHECKIN })])] }),
                ],
            })
        );
        expect(checkOk(r, 'lodging')).toBe(true);
        expect(checkOk(r, 'activities')).toBe(true);
        expect(r.freeDays).toEqual([]);
    });
});

describe('deriveTripReadiness — budget', () => {
    it('treats a positive numeric budget as set', () => {
        const r = deriveTripReadiness(makeTrip({ budget: 500 }));
        expect(checkOk(r, 'budget')).toBe(true);
    });

    it('treats a positive string budget as set', () => {
        const r = deriveTripReadiness(makeTrip({ budget: '500' }));
        expect(checkOk(r, 'budget')).toBe(true);
    });

    it('treats a zero or non-numeric budget as not set', () => {
        expect(checkOk(deriveTripReadiness(makeTrip({ budget: 0 })), 'budget')).toBe(false);
        expect(checkOk(deriveTripReadiness(makeTrip({ budget: 'free' })), 'budget')).toBe(false);
        expect(checkOk(deriveTripReadiness(makeTrip()), 'budget')).toBe(false);
    });
});

describe('deriveTripReadiness — graded free-days slice', () => {
    it('dents but does not tank the score for one empty day among filled ones', () => {
        // 1 filled + 1 empty day, nothing else set: only the activities weight
        // (25) plus a half-share of the 10-pt free-days slice (5) is earned.
        const r = deriveTripReadiness(
            makeTrip({
                destinations: [
                    makeDest({
                        itinerary: [
                            makeDay([makeActivity({ kind: ACTIVITY_KIND.PLACE })]),
                            makeDay([]),
                        ],
                    }),
                ],
            })
        );
        expect(r.freeDays).toEqual([2]);
        expect(r.percent).toBe(30);
    });
});
