import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND } from 'constants';
import type { Activity } from 'types';
import { nextActivityTime } from './nextActivityTime';

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
    id: 1,
    ...overrides,
});

describe('nextActivityTime', () => {
    it('defaults an empty/absent day to 9:00–10:00', () => {
        expect(nextActivityTime([])).toEqual({
            startTime: '09:00',
            endTime: '10:00',
        });
        expect(nextActivityTime(null)).toEqual({
            startTime: '09:00',
            endTime: '10:00',
        });
        expect(nextActivityTime(undefined)).toEqual({
            startTime: '09:00',
            endTime: '10:00',
        });
    });

    it('rounds an on-the-hour end up to the next whole hour', () => {
        // 03:00 end -> next whole hour strictly after -> 04:00
        expect(nextActivityTime([makeActivity({ endTime: '03:00' })])).toEqual({
            startTime: '04:00',
            endTime: '05:00',
        });
    });

    it('floors-to-hour then adds one for a mid-hour end', () => {
        // 10:45 -> 11:00, 11:24 -> 12:00
        expect(nextActivityTime([makeActivity({ endTime: '10:45' })])).toEqual({
            startTime: '11:00',
            endTime: '12:00',
        });
        expect(nextActivityTime([makeActivity({ endTime: '11:24' })])).toEqual({
            startTime: '12:00',
            endTime: '13:00',
        });
    });

    it('prefers endTime over startTime when both are set', () => {
        expect(
            nextActivityTime([
                makeActivity({ startTime: '10:00', endTime: '14:00' }),
            ]),
        ).toEqual({ startTime: '15:00', endTime: '16:00' });
    });

    it('falls back to startTime when endTime is absent', () => {
        expect(
            nextActivityTime([makeActivity({ startTime: '08:00' })]),
        ).toEqual({ startTime: '09:00', endTime: '10:00' });
    });

    it('uses the LATEST end across multiple activities', () => {
        expect(
            nextActivityTime([
                makeActivity({ id: 1, endTime: '12:00' }),
                makeActivity({ id: 2, endTime: '18:00' }),
                makeActivity({ id: 3, endTime: '09:00' }),
            ]),
        ).toEqual({ startTime: '19:00', endTime: '20:00' });
    });

    it('ignores note activities (timeless) and starts at 9:00', () => {
        expect(
            nextActivityTime([makeActivity({ kind: ACTIVITY_KIND.NOTE, startTime: '18:00', endTime: '20:00' })]),
        ).toEqual({ startTime: '09:00', endTime: '10:00' });
    });

    it('uses the last flight segment arrival time', () => {
        expect(
            nextActivityTime([
                makeActivity({
                    kind: ACTIVITY_KIND.FLIGHT,
                    flightSegments: [
                        { departTime: '06:00', arrivalTime: '07:30' },
                        { departTime: '08:00', arrivalTime: '09:30' },
                    ],
                }),
            ]),
        ).toEqual({ startTime: '10:00', endTime: '11:00' });
    });

    it('falls back to the first segment depart time when arrival is missing', () => {
        expect(
            nextActivityTime([
                makeActivity({
                    kind: ACTIVITY_KIND.FLIGHT,
                    flightSegments: [{ departTime: '07:00' }],
                }),
            ]),
        ).toEqual({ startTime: '08:00', endTime: '09:00' });
    });

    it('treats a flight with no segments as timeless (9:00 default)', () => {
        expect(
            nextActivityTime([
                makeActivity({ kind: ACTIVITY_KIND.FLIGHT, flightSegments: [] }),
            ]),
        ).toEqual({ startTime: '09:00', endTime: '10:00' });
        expect(
            nextActivityTime([makeActivity({ kind: ACTIVITY_KIND.FLIGHT })]),
        ).toEqual({ startTime: '09:00', endTime: '10:00' });
    });

    it('caps the suggestion at 23:00 start / 23:59 end for a late end', () => {
        expect(nextActivityTime([makeActivity({ endTime: '23:30' })])).toEqual({
            startTime: '23:00',
            endTime: '23:59',
        });
    });

    it('ignores an invalid endTime and falls back to startTime', () => {
        // hours > 23 -> unparseable end -> uses startTime 10:00
        expect(
            nextActivityTime([
                makeActivity({ endTime: '25:00', startTime: '10:00' }),
            ]),
        ).toEqual({ startTime: '11:00', endTime: '12:00' });
    });

    it('rejects a non time-shaped string as unparseable', () => {
        // fails the HH:mm regex entirely -> null -> only activity -> 9:00 default
        expect(nextActivityTime([makeActivity({ endTime: 'nope' })])).toEqual({
            startTime: '09:00',
            endTime: '10:00',
        });
    });

    it('rejects out-of-range minutes as unparseable', () => {
        // 10:75 minutes>59 -> null -> only activity -> 9:00 default
        expect(nextActivityTime([makeActivity({ endTime: '10:75' })])).toEqual({
            startTime: '09:00',
            endTime: '10:00',
        });
    });

    it('trims surrounding whitespace on a time string', () => {
        expect(
            nextActivityTime([makeActivity({ endTime: '  15:00  ' })]),
        ).toEqual({ startTime: '16:00', endTime: '17:00' });
    });

    it('accepts a single-digit hour', () => {
        expect(nextActivityTime([makeActivity({ endTime: '9:00' })])).toEqual({
            startTime: '10:00',
            endTime: '11:00',
        });
    });
});
