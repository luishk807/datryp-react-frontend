import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND } from 'constants';
import { pickSmartEntryLocation } from './pickSmartEntryLocation';

// Loose builders — the helper only reads a handful of fields; the runner
// strips types so partial shapes are fine at runtime.
type AnyActivity = Record<string, unknown>;
const act = (over: AnyActivity = {}): AnyActivity => ({
    id: 1,
    kind: ACTIVITY_KIND.PLACE,
    ...over,
});
const day = (date: string, activities: AnyActivity[] = []): AnyActivity => ({
    id: 1,
    date,
    activities,
});
const dest = (itinerary: unknown): AnyActivity => ({
    id: 1,
    country: { name: 'X' },
    itinerary,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pick = (args: any): string | undefined => pickSmartEntryLocation(args);

describe('pickSmartEntryLocation — fallback / guard branches', () => {
    it('returns the trimmed fallback country when there is no current date', () => {
        expect(
            pick({
                destinations: [],
                currentDate: undefined,
                fallbackCountry: '  Japan  ',
            }),
        ).toBe('Japan');
    });

    it('returns undefined when the fallback is blank', () => {
        expect(
            pick({
                destinations: [],
                currentDate: undefined,
                fallbackCountry: '   ',
            }),
        ).toBeUndefined();
    });

    it('returns fallback when no day carries a date (empty allDays)', () => {
        expect(
            pick({
                destinations: [dest([day('', [])])],
                currentDate: '2026-06-10',
                fallbackCountry: 'Spain',
            }),
        ).toBe('Spain');
    });

    it('tolerates a destination with no itinerary array', () => {
        expect(
            pick({
                destinations: [dest(undefined), dest([day('2026-06-01', [])])],
                currentDate: '2099-01-01',
                fallbackCountry: 'Spain',
            }),
        ).toBe('Spain');
    });

    it('returns fallback when the current date matches no day', () => {
        expect(
            pick({
                destinations: [dest([day('2026-06-01', [])])],
                currentDate: '2026-12-31',
                fallbackCountry: 'Italy',
            }),
        ).toBe('Italy');
    });

    it('matches the day across an ISO-timestamp format drift', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-10', [
                            act({ location: 'Hotel Riu, Panama' }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-10T08:00:00',
                fallbackCountry: 'Panama',
            }),
        ).toBe('Hotel Riu, Panama');
    });
});

describe('pickSmartEntryLocation — Rule 1: preceding activity address', () => {
    it('returns the location of an activity on the current day', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-10', [
                            act({ location: 'Hotel Riu, Panama' }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-10',
                fallbackCountry: 'Panama',
            }),
        ).toBe('Hotel Riu, Panama');
    });

    it('falls back to structured city/country when location is blank', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-10', [
                            act({
                                location: '   ',
                                placeCity: 'Kyoto',
                                placeCountry: 'Japan',
                            }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-10',
            }),
        ).toBe('Kyoto, Japan');
    });

    it('picks the closest activity that starts before currentActivityTime', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-10', [
                            act({ id: 1, location: 'A', startTime: '09:00' }),
                            act({ id: 2, location: 'B', startTime: '11:15' }),
                            act({ id: 3, location: 'C', startTime: '12:00' }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-10',
                currentActivityTime: '11:40',
            }),
        ).toBe('B');
    });

    it('excludes the calling activity via excludeActivityId', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-10', [
                            act({ id: 5, location: 'Target', startTime: '10:00' }),
                            act({ id: 6, location: 'Origin', startTime: '09:00' }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-10',
                excludeActivityId: 5,
            }),
        ).toBe('Origin');
    });

    it('sorts timed activities ahead of untimed ones', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-10', [
                            act({ id: 1, location: 'Untimed' }),
                            act({ id: 2, location: 'Timed', startTime: '10:00' }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-10',
            }),
        ).toBe('Timed');
    });

    it('ignores untimed activities when a currentActivityTime is set', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-10', [act({ location: 'NoTime Place' })]),
                    ]),
                ],
                currentDate: '2026-06-10',
                currentActivityTime: '10:00',
                fallbackCountry: 'Peru',
            }),
        ).toBe('Peru');
    });
});

describe('pickSmartEntryLocation — Rule 2: hotel on the current day', () => {
    it('returns the hotel name when the hotel has no textual address', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-10', [
                            act({
                                id: 1,
                                kind: ACTIVITY_KIND.HOTEL_CHECKIN,
                                name: 'Marriott',
                                startTime: '15:00',
                            }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-10',
            }),
        ).toBe('Marriott');
    });
});

describe('pickSmartEntryLocation — Rule 3: prior-day hotel', () => {
    it('walks back to the most recent hotel check-in address', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-09', [
                            act({
                                id: 1,
                                kind: ACTIVITY_KIND.HOTEL_CHECKIN,
                                location: 'Prior Hotel Address',
                            }),
                        ]),
                        day('2026-06-10', [act({ id: 2 })]),
                    ]),
                ],
                currentDate: '2026-06-10',
                fallbackCountry: 'France',
            }),
        ).toBe('Prior Hotel Address');
    });

    it('falls back to the hotel name when it has no address', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-09', [
                            act({
                                id: 1,
                                kind: ACTIVITY_KIND.HOTEL_CHECKIN,
                                name: 'NamedOnly',
                            }),
                        ]),
                        day('2026-06-10', [act({ id: 2 })]),
                    ]),
                ],
                currentDate: '2026-06-10',
            }),
        ).toBe('NamedOnly');
    });
});

describe('pickSmartEntryLocation — Rule 4: flight arrival airport', () => {
    it('returns the outbound arrival (forward walk beats the return leg)', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-09', [
                            act({
                                id: 1,
                                kind: ACTIVITY_KIND.FLIGHT,
                                flightSegments: [
                                    { departAirport: 'JFK', arrivalAirport: 'CDG' },
                                ],
                            }),
                        ]),
                        day('2026-06-15', [
                            act({
                                id: 2,
                                kind: ACTIVITY_KIND.FLIGHT,
                                flightSegments: [
                                    { departAirport: 'CDG', arrivalAirport: 'JFK' },
                                ],
                            }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-15',
                fallbackCountry: 'France',
            }),
        ).toBe('CDG');
    });

    it('returns the arrival when no home airport is known', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-09', [
                            act({
                                id: 1,
                                kind: ACTIVITY_KIND.FLIGHT,
                                flightSegments: [{ arrivalAirport: 'NRT' }],
                            }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-09',
                fallbackCountry: 'Japan',
            }),
        ).toBe('NRT');
    });

    it('skips a leg that arrives back at the home airport', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-09', [
                            act({
                                id: 1,
                                kind: ACTIVITY_KIND.FLIGHT,
                                flightSegments: [
                                    { departAirport: 'JFK', arrivalAirport: 'JFK' },
                                ],
                            }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-09',
                fallbackCountry: 'Chile',
            }),
        ).toBe('Chile');
    });

    it('skips a flight with a blank arrival airport', () => {
        expect(
            pick({
                destinations: [
                    dest([
                        day('2026-06-09', [
                            act({
                                id: 1,
                                kind: ACTIVITY_KIND.FLIGHT,
                                flightSegments: [
                                    { departAirport: 'JFK', arrivalAirport: '  ' },
                                ],
                            }),
                        ]),
                    ]),
                ],
                currentDate: '2026-06-09',
                fallbackCountry: 'Peru',
            }),
        ).toBe('Peru');
    });
});
