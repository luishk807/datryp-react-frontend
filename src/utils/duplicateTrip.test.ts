import { describe, it, expect } from 'vitest';
import { TRIP_STATUS, ACTIVITY_KIND } from 'constants';
import type {
    Activity,
    Destination,
    FlightInfo,
    TripState,
    TripStatus,
} from 'types';
import { addDays, now } from './date';
import {
    duplicateTripState,
    previewDuplicate,
    startsInPast,
    findTripConflicts,
} from './duplicateTrip';

// ---- fixture factories (build only what each test needs) ----
const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
    id: 1,
    ...overrides,
});

const makeDest = (overrides: Partial<Destination> = {}): Destination => ({
    id: 1,
    country: { id: 1, name: 'Japan' },
    itinerary: [],
    ...overrides,
});

const makeTrip = (overrides: Partial<TripState> = {}): TripState => ({
    destinations: [],
    ...overrides,
});

describe('duplicateTripState', () => {
    it('drops the backend identity, suffixes the name and shifts trip dates', () => {
        const source = makeTrip({
            apiId: 'trip-uuid',
            name: 'Tokyo Getaway',
            startDate: '2026-01-10',
            endDate: '2026-01-14',
            status: { id: 'confirmed-uuid', name: TRIP_STATUS.CONFIRMED },
        });
        const out = duplicateTripState(source, '2026-01-15');
        expect(out.apiId).toBeUndefined();
        expect(out.name).toBe('Tokyo Getaway (Copy)');
        expect(out.startDate).toBe('2026-01-15');
        expect(out.endDate).toBe('2026-01-19');
    });

    it('defaults to a Planning name-only status when none is supplied', () => {
        const out = duplicateTripState(makeTrip({ startDate: '2026-01-10' }), '2026-01-12');
        expect(out.status).toEqual({ id: 0, name: TRIP_STATUS.PLANNING });
    });

    it('uses the supplied planning status (with backend UUID) for the copy', () => {
        const planning: TripStatus = { id: 'planning-uuid', name: TRIP_STATUS.PLANNING };
        const out = duplicateTripState(
            makeTrip({ startDate: '2026-01-10' }),
            '2026-01-12',
            planning
        );
        expect(out.status).toEqual(planning);
        // Copied, not the same reference.
        expect(out.status).not.toBe(planning);
    });

    it('names an unnamed trip "Trip (Copy)" and trims whitespace', () => {
        expect(duplicateTripState(makeTrip(), '2026-01-01').name).toBe('Trip (Copy)');
        expect(
            duplicateTripState(makeTrip({ name: '   Spaced   ' }), '2026-01-01').name
        ).toBe('Spaced (Copy)');
    });

    it('passes dates through unchanged (offset 0) when the source has no start date', () => {
        const source = makeTrip({
            endDate: '2026-02-02',
            destinations: [
                makeDest({
                    startDate: '2026-02-01',
                    itinerary: [{ id: 1, date: '2026-02-01', activities: [] }],
                }),
            ],
        });
        const out = duplicateTripState(source, '2026-05-05');
        expect(out.startDate).toBeUndefined();
        expect(out.endDate).toBe('2026-02-02');
        expect(out.destinations[0].startDate).toBe('2026-02-01');
        expect(out.destinations[0].itinerary[0].date).toBe('2026-02-01');
    });

    it('shifts destination boundary dates, flight info and clears its payment', () => {
        const flightInfo: FlightInfo = {
            departDate: '2026-01-10',
            arrivalDate: '2026-01-10',
            paidAt: '2026-01-01',
            paidBy: { id: 'u1', name: 'Ann' },
            segments: [{ departDate: '2026-01-10', arrivalDate: '2026-01-11' }],
        };
        const source = makeTrip({
            startDate: '2026-01-10',
            destinations: [
                makeDest({
                    startDate: '2026-01-10',
                    endDate: '2026-01-12',
                    date: '2026-01-10',
                    flightInfo,
                    itinerary: [],
                }),
            ],
        });
        const [dest] = duplicateTripState(source, '2026-01-15').destinations;
        expect(dest.startDate).toBe('2026-01-15');
        expect(dest.endDate).toBe('2026-01-17');
        expect(dest.date).toBe('2026-01-15');
        expect(dest.flightInfo?.departDate).toBe('2026-01-15');
        expect(dest.flightInfo?.arrivalDate).toBe('2026-01-15');
        expect(dest.flightInfo?.paidAt).toBeNull();
        expect(dest.flightInfo?.paidBy).toBeNull();
        expect(dest.flightInfo?.segments?.[0]).toEqual({
            departDate: '2026-01-15',
            arrivalDate: '2026-01-16',
        });
    });

    it('leaves a destination without flight info undefined', () => {
        const source = makeTrip({
            startDate: '2026-01-10',
            destinations: [makeDest({ startDate: '2026-01-10' })],
        });
        expect(duplicateTripState(source, '2026-01-15').destinations[0].flightInfo).toBeUndefined();
    });

    it('resets activities: status to planning, payment cleared, segment dates shifted', () => {
        const activity = makeActivity({
            kind: ACTIVITY_KIND.FLIGHT,
            status: { id: 'confirmed-uuid', name: TRIP_STATUS.CONFIRMED },
            paidAt: '2026-01-01',
            paidBy: { id: 'u1', name: 'Ann' },
            flightSegments: [{ departDate: '2026-01-10', arrivalDate: '2026-01-11' }],
            transitSegments: [{ departDate: '2026-01-11', arrivalDate: '2026-01-11' }],
        });
        const source = makeTrip({
            startDate: '2026-01-10',
            destinations: [
                makeDest({
                    startDate: '2026-01-10',
                    itinerary: [{ id: 1, date: '2026-01-10', activities: [activity] }],
                }),
            ],
        });
        const planning: TripStatus = { id: 'planning-uuid', name: TRIP_STATUS.PLANNING };
        const out = duplicateTripState(source, '2026-01-15', planning);
        const day = out.destinations[0].itinerary[0];
        expect(day.date).toBe('2026-01-15');
        const a = day.activities[0];
        expect(a.status).toEqual(planning);
        expect(a.paidAt).toBeNull();
        expect(a.paidBy).toBeNull();
        expect(a.flightSegments?.[0]).toEqual({
            departDate: '2026-01-15',
            arrivalDate: '2026-01-16',
        });
        expect(a.transitSegments?.[0]).toEqual({
            departDate: '2026-01-16',
            arrivalDate: '2026-01-16',
        });
    });

    it('handles an activity with no segments (leaves segment arrays undefined)', () => {
        const source = makeTrip({
            startDate: '2026-01-10',
            destinations: [
                makeDest({
                    startDate: '2026-01-10',
                    itinerary: [
                        { id: 1, date: '2026-01-10', activities: [makeActivity({ name: 'Dinner' })] },
                    ],
                }),
            ],
        });
        const a = duplicateTripState(source, '2026-01-12').destinations[0].itinerary[0].activities[0];
        expect(a.flightSegments).toBeUndefined();
        expect(a.transitSegments).toBeUndefined();
        expect(a.name).toBe('Dinner');
    });
});

describe('previewDuplicate', () => {
    it('flattens days across destinations and sorts by the new date', () => {
        const source = makeTrip({
            startDate: '2026-01-10',
            endDate: '2026-01-14',
            destinations: [
                makeDest({
                    id: 1,
                    itinerary: [
                        { id: 1, date: '2026-01-12', activities: [makeActivity(), makeActivity()] },
                    ],
                }),
                makeDest({
                    id: 2,
                    itinerary: [{ id: 2, date: '2026-01-10', activities: [makeActivity()] }],
                }),
            ],
        });
        const preview = previewDuplicate(source, '2026-01-20');
        // offset = 10 days.
        expect(preview.newStartDate).toBe('2026-01-20');
        expect(preview.newEndDate).toBe('2026-01-24');
        expect(preview.days).toEqual([
            { oldDate: '2026-01-10', newDate: '2026-01-20', activityCount: 1 },
            { oldDate: '2026-01-12', newDate: '2026-01-22', activityCount: 2 },
        ]);
    });

    it('falls back to the requested start when the source has no dates', () => {
        const preview = previewDuplicate(makeTrip(), '2026-03-03');
        expect(preview.newStartDate).toBe('2026-03-03');
        expect(preview.newEndDate).toBe('2026-03-03');
        expect(preview.days).toEqual([]);
    });

    it('counts zero activities for an empty day', () => {
        const source = makeTrip({
            startDate: '2026-01-10',
            destinations: [makeDest({ itinerary: [{ id: 1, date: '2026-01-10', activities: [] }] })],
        });
        expect(previewDuplicate(source, '2026-01-10').days[0].activityCount).toBe(0);
    });
});

describe('defensive fallbacks (missing arrays / dates)', () => {
    it('duplicateTripState tolerates a trip with no destinations array', () => {
        const out = duplicateTripState({} as TripState, '2026-01-01');
        expect(out.destinations).toEqual([]);
        expect(out.name).toBe('Trip (Copy)');
    });

    it('duplicateTripState tolerates missing itinerary, day date and activities', () => {
        const source = makeTrip({
            startDate: '2026-01-10',
            destinations: [
                makeDest({ id: 1, itinerary: undefined as never }),
                makeDest({
                    id: 2,
                    itinerary: [{ id: 1, date: undefined as never, activities: undefined as never }],
                }),
            ],
        });
        const out = duplicateTripState(source, '2026-01-15');
        expect(out.destinations[0].itinerary).toEqual([]);
        expect(out.destinations[1].itinerary[0].date).toBeUndefined();
        expect(out.destinations[1].itinerary[0].activities).toEqual([]);
    });

    it('previewDuplicate tolerates missing destinations, itinerary, dates and activities', () => {
        expect(previewDuplicate({} as TripState, '2026-01-01').days).toEqual([]);

        const source = makeTrip({
            startDate: '2026-01-10',
            destinations: [
                makeDest({ id: 1, itinerary: undefined as never }),
                makeDest({
                    id: 2,
                    itinerary: [{ id: 1, date: undefined as never, activities: undefined as never }],
                }),
            ],
        });
        const preview = previewDuplicate(source, '2026-01-15');
        expect(preview.days).toEqual([
            { oldDate: undefined, newDate: undefined, activityCount: 0 },
        ]);
    });

    it('previewDuplicate keeps equal new-dates stable in the sort', () => {
        const source = makeTrip({
            startDate: '2026-01-10',
            destinations: [
                makeDest({ id: 1, itinerary: [{ id: 1, date: '2026-01-10', activities: [] }] }),
                makeDest({ id: 2, itinerary: [{ id: 2, date: '2026-01-10', activities: [makeActivity()] }] }),
            ],
        });
        const preview = previewDuplicate(source, '2026-01-15');
        expect(preview.days.map((d) => d.newDate)).toEqual(['2026-01-15', '2026-01-15']);
    });
});

describe('startsInPast', () => {
    it('is true for a date before today', () => {
        expect(startsInPast(addDays(now(), -3))).toBe(true);
    });

    it('is false for today and future dates', () => {
        expect(startsInPast(now())).toBe(false);
        expect(startsInPast(addDays(now(), 5))).toBe(false);
    });

    it('is false for an empty string', () => {
        expect(startsInPast('')).toBe(false);
    });
});

describe('findTripConflicts', () => {
    const others = [
        { name: 'Overlaps', startDate: '2026-01-15', endDate: '2026-01-25' },
        { name: 'Before', startDate: '2026-01-01', endDate: '2026-01-05' },
        { name: 'After', startDate: '2026-01-25', endDate: '2026-01-30' },
        { name: 'TouchesEnd', startDate: '2026-01-20', endDate: '2026-01-22' },
        { name: 'MissingDates', startDate: '', endDate: '' },
    ];

    it('returns only inclusively-overlapping ranges', () => {
        const conflicts = findTripConflicts('2026-01-10', '2026-01-20', others);
        expect(conflicts.map((c) => c.name)).toEqual(['Overlaps', 'TouchesEnd']);
    });

    it('returns an empty list when the copy has no start or end', () => {
        expect(findTripConflicts('', '2026-01-20', others)).toEqual([]);
        expect(findTripConflicts('2026-01-10', '', others)).toEqual([]);
    });

    it('returns an empty list when nothing overlaps', () => {
        expect(findTripConflicts('2026-06-01', '2026-06-10', others)).toEqual([]);
    });
});
