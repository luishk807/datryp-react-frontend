import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND } from 'constants';
import type { Activity, Destination, ItineraryDay, TripState } from 'types';
import {
    RESERVATION_KINDS,
    isReservationKind,
    reservationBookedDate,
    reservationNeedsReschedule,
    classifyShiftImpact,
    shiftTripDates,
} from './shiftTripDates';

// ---- fixture factories (build only what each test needs) ----
const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
    id: 1,
    ...overrides,
});

const makeDay = (overrides: Partial<ItineraryDay> = {}): ItineraryDay => ({
    id: 1,
    date: '2026-07-01',
    activities: [],
    ...overrides,
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

describe('isReservationKind', () => {
    it('is true for every reservation kind', () => {
        for (const kind of RESERVATION_KINDS) {
            expect(isReservationKind(kind)).toBe(true);
        }
    });

    it('is false for flexible kinds and undefined', () => {
        expect(isReservationKind(ACTIVITY_KIND.PLACE)).toBe(false);
        expect(isReservationKind(ACTIVITY_KIND.NOTE)).toBe(false);
        expect(isReservationKind(ACTIVITY_KIND.OTHER)).toBe(false);
        expect(isReservationKind(undefined)).toBe(false);
        expect(isReservationKind('')).toBe(false);
    });
});

describe('reservationBookedDate', () => {
    it('reads the first flight segment departDate for flights', () => {
        const a = makeActivity({
            kind: ACTIVITY_KIND.FLIGHT,
            flightSegments: [{ departDate: '2026-07-04' }, { departDate: '2026-07-05' }],
        });
        expect(reservationBookedDate(a)).toBe('2026-07-04');
    });

    it('reads the first transit segment departDate for train/bus/rental_car', () => {
        for (const kind of [ACTIVITY_KIND.TRAIN, ACTIVITY_KIND.BUS, ACTIVITY_KIND.RENTAL_CAR]) {
            const a = makeActivity({
                kind,
                transitSegments: [{ departDate: '2026-07-06' }],
            });
            expect(reservationBookedDate(a)).toBe('2026-07-06');
        }
    });

    it('is undefined for a flight with no segments or an empty depart date', () => {
        expect(reservationBookedDate(makeActivity({ kind: ACTIVITY_KIND.FLIGHT }))).toBeUndefined();
        expect(
            reservationBookedDate(
                makeActivity({ kind: ACTIVITY_KIND.FLIGHT, flightSegments: [] })
            )
        ).toBeUndefined();
        expect(
            reservationBookedDate(
                makeActivity({ kind: ACTIVITY_KIND.FLIGHT, flightSegments: [{ departDate: '' }] })
            )
        ).toBeUndefined();
    });

    it('is undefined for a transit kind carrying no segments', () => {
        expect(
            reservationBookedDate(makeActivity({ kind: ACTIVITY_KIND.TRAIN }))
        ).toBeUndefined();
    });

    it('is undefined for hotels and flexible kinds (no booked segment to compare)', () => {
        expect(
            reservationBookedDate(makeActivity({ kind: ACTIVITY_KIND.HOTEL_CHECKIN }))
        ).toBeUndefined();
        expect(reservationBookedDate(makeActivity({ kind: ACTIVITY_KIND.PLACE }))).toBeUndefined();
        expect(reservationBookedDate(makeActivity({}))).toBeUndefined();
    });
});

describe('reservationNeedsReschedule', () => {
    it('is true when the booked date no longer matches the day it sits on', () => {
        const a = makeActivity({
            kind: ACTIVITY_KIND.FLIGHT,
            flightSegments: [{ departDate: '2026-07-04' }],
        });
        expect(reservationNeedsReschedule(a, '2026-07-20')).toBe(true);
    });

    it('is false when the booked date matches the current day', () => {
        const a = makeActivity({
            kind: ACTIVITY_KIND.FLIGHT,
            flightSegments: [{ departDate: '2026-07-04' }],
        });
        expect(reservationNeedsReschedule(a, '2026-07-04')).toBe(false);
    });

    it('is false when there is no booked date', () => {
        expect(
            reservationNeedsReschedule(makeActivity({ kind: ACTIVITY_KIND.FLIGHT }), '2026-07-20')
        ).toBe(false);
    });

    it('is false when the day date is missing', () => {
        const a = makeActivity({
            kind: ACTIVITY_KIND.FLIGHT,
            flightSegments: [{ departDate: '2026-07-04' }],
        });
        expect(reservationNeedsReschedule(a, undefined)).toBe(false);
    });
});

describe('classifyShiftImpact', () => {
    it('counts flexible activities and lists reservations, excluding notes', () => {
        const trip = makeTrip({
            destinations: [
                makeDest({
                    itinerary: [
                        makeDay({
                            activities: [
                                makeActivity({ kind: ACTIVITY_KIND.PLACE, name: 'Museum' }),
                                makeActivity({ kind: ACTIVITY_KIND.NOTE, name: 'Remember passport' }),
                                makeActivity({
                                    kind: ACTIVITY_KIND.FLIGHT,
                                    name: 'AA100',
                                    flightSegments: [{ departDate: '2026-07-04' }],
                                }),
                                makeActivity({ kind: ACTIVITY_KIND.OTHER }),
                            ],
                        }),
                    ],
                }),
            ],
        });
        const impact = classifyShiftImpact(trip);
        // place + other are flexible; note excluded; flight is a reservation.
        expect(impact.flexibleCount).toBe(2);
        expect(impact.reservations).toEqual([{ name: 'AA100', kind: ACTIVITY_KIND.FLIGHT }]);
    });

    it('treats an activity with no kind as a flexible place', () => {
        const trip = makeTrip({
            destinations: [makeDest({ itinerary: [makeDay({ activities: [makeActivity({})] })] })],
        });
        const impact = classifyShiftImpact(trip);
        expect(impact.flexibleCount).toBe(1);
        expect(impact.reservations).toHaveLength(0);
    });

    it('falls back to the kind as the reservation name when the name is blank', () => {
        const trip = makeTrip({
            destinations: [
                makeDest({
                    itinerary: [
                        makeDay({
                            activities: [
                                makeActivity({ kind: ACTIVITY_KIND.TRAIN, name: '   ' }),
                                makeActivity({ kind: ACTIVITY_KIND.HOTEL_CHECKIN }),
                            ],
                        }),
                    ],
                }),
            ],
        });
        const impact = classifyShiftImpact(trip);
        expect(impact.reservations).toEqual([
            { name: ACTIVITY_KIND.TRAIN, kind: ACTIVITY_KIND.TRAIN },
            { name: ACTIVITY_KIND.HOTEL_CHECKIN, kind: ACTIVITY_KIND.HOTEL_CHECKIN },
        ]);
    });

    it('handles empty / missing destinations, itineraries and activities', () => {
        expect(classifyShiftImpact(makeTrip())).toEqual({ flexibleCount: 0, reservations: [] });
        expect(classifyShiftImpact({} as TripState)).toEqual({
            flexibleCount: 0,
            reservations: [],
        });
        const trip = makeTrip({
            destinations: [makeDest({ itinerary: [makeDay({ activities: undefined as never })] })],
        });
        expect(classifyShiftImpact(trip)).toEqual({ flexibleCount: 0, reservations: [] });
    });

    it('tolerates a destination with no itinerary array', () => {
        const trip = makeTrip({
            destinations: [makeDest({ itinerary: undefined as never })],
        });
        expect(classifyShiftImpact(trip)).toEqual({ flexibleCount: 0, reservations: [] });
    });
});

describe('shiftTripDates', () => {
    it('returns the same trip reference when the delta is zero', () => {
        const trip = makeTrip({ startDate: '2026-07-01', endDate: '2026-07-05' });
        expect(shiftTripDates(trip, 0)).toBe(trip);
    });

    it('shifts trip, destination and itinerary-day dates by a positive delta', () => {
        const trip = makeTrip({
            startDate: '2026-07-01',
            endDate: '2026-07-05',
            destinations: [
                makeDest({
                    startDate: '2026-07-01',
                    endDate: '2026-07-05',
                    date: '2026-07-01',
                    itinerary: [makeDay({ date: '2026-07-01' }), makeDay({ date: '2026-07-02' })],
                }),
            ],
        });
        const out = shiftTripDates(trip, 3);
        expect(out.startDate).toBe('2026-07-04');
        expect(out.endDate).toBe('2026-07-08');
        expect(out.destinations[0].startDate).toBe('2026-07-04');
        expect(out.destinations[0].endDate).toBe('2026-07-08');
        expect(out.destinations[0].date).toBe('2026-07-04');
        expect(out.destinations[0].itinerary.map((d) => d.date)).toEqual([
            '2026-07-04',
            '2026-07-05',
        ]);
    });

    it('shifts backward with a negative delta', () => {
        const trip = makeTrip({
            startDate: '2026-07-10',
            endDate: '2026-07-12',
            destinations: [makeDest({ itinerary: [makeDay({ date: '2026-07-10' })] })],
        });
        const out = shiftTripDates(trip, -2);
        expect(out.startDate).toBe('2026-07-08');
        expect(out.endDate).toBe('2026-07-10');
        expect(out.destinations[0].itinerary[0].date).toBe('2026-07-08');
    });

    it('leaves undefined destination boundary dates undefined', () => {
        const trip = makeTrip({
            startDate: '2026-07-01',
            endDate: '2026-07-03',
            destinations: [makeDest({ itinerary: [makeDay({ date: '2026-07-01' })] })],
        });
        const out = shiftTripDates(trip, 5);
        expect(out.destinations[0].startDate).toBeUndefined();
        expect(out.destinations[0].endDate).toBeUndefined();
        expect(out.destinations[0].date).toBeUndefined();
    });

    it('leaves reservation booking dates untouched so they surface as needing reschedule', () => {
        const flight = makeActivity({
            kind: ACTIVITY_KIND.FLIGHT,
            flightSegments: [{ departDate: '2026-07-04' }],
        });
        const trip = makeTrip({
            startDate: '2026-07-04',
            endDate: '2026-07-06',
            destinations: [
                makeDest({ itinerary: [makeDay({ date: '2026-07-04', activities: [flight] })] }),
            ],
        });
        const out = shiftTripDates(trip, 16);
        const shiftedFlight = out.destinations[0].itinerary[0].activities[0];
        expect(shiftedFlight.flightSegments?.[0].departDate).toBe('2026-07-04');
        expect(reservationNeedsReschedule(shiftedFlight, out.destinations[0].itinerary[0].date)).toBe(
            true
        );
    });

    it('handles a trip with no destinations and undefined trip dates', () => {
        const out = shiftTripDates(makeTrip(), 2);
        expect(out.destinations).toEqual([]);
        expect(out.startDate).toBeUndefined();
        expect(out.endDate).toBeUndefined();
    });

    it('tolerates an undefined destinations array and undefined itinerary', () => {
        const out = shiftTripDates({} as TripState, 2);
        expect(out.destinations).toEqual([]);
        const withNoItinerary = shiftTripDates(
            makeTrip({ destinations: [makeDest({ itinerary: undefined as never })] }),
            2
        );
        expect(withNoItinerary.destinations[0].itinerary).toEqual([]);
    });
});
