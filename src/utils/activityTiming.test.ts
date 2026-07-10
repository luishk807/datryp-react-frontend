import { describe, it, expect } from 'vitest';
import {
    safeFormatTime,
    getActivityTiming,
    getActivityProgress,
    type TimedActivityInput,
} from './activityTiming';

const DAY = '2026-05-25';
// dayDate + "T" + time is parsed as LOCAL time by `new Date`, so the `now`
// Dates below are built the same way to keep every comparison timezone-stable.
const at = (time: string): Date => new Date(`${DAY}T${time}`);

describe('safeFormatTime', () => {
    it('returns empty string for missing / blank input', () => {
        expect(safeFormatTime(null)).toBe('');
        expect(safeFormatTime(undefined)).toBe('');
        expect(safeFormatTime('')).toBe('');
        expect(safeFormatTime('   ')).toBe('');
    });

    it('returns empty string for non-time / ISO-shaped input', () => {
        expect(safeFormatTime('not-a-time')).toBe('');
        expect(safeFormatTime('2026-05-25T09:00:00')).toBe('');
    });

    it('formats a padded and an unpadded morning time', () => {
        expect(safeFormatTime('09:00')).toBe('9:00 AM');
        expect(safeFormatTime('9:00')).toBe('9:00 AM');
    });

    it('formats afternoon / evening times as PM', () => {
        expect(safeFormatTime('13:30')).toBe('1:30 PM');
        expect(safeFormatTime('23:59')).toBe('11:59 PM');
    });

    it('handles the 12 o’clock boundaries', () => {
        expect(safeFormatTime('00:00')).toBe('12:00 AM');
        expect(safeFormatTime('12:00')).toBe('12:00 PM');
    });

    it('accepts an HH:mm:ss string and drops the seconds', () => {
        expect(safeFormatTime('14:05:30')).toBe('2:05 PM');
    });

    it('rejects out-of-range hours / minutes', () => {
        expect(safeFormatTime('24:00')).toBe('');
        expect(safeFormatTime('10:60')).toBe('');
    });
});

describe('getActivityTiming', () => {
    const timed = (
        startTime?: string,
        endTime?: string,
    ): TimedActivityInput => ({ startTime, endTime });

    it('returns null when neither anchor can be built (empty day date)', () => {
        expect(getActivityTiming(timed('10:00', '12:00'), '', at('10:00'))).toBeNull();
    });

    it('is upcoming before the start time', () => {
        expect(
            getActivityTiming(timed('10:00', '12:00'), DAY, at('09:00')),
        ).toBe('upcoming');
    });

    it('is current within [start, end]', () => {
        expect(
            getActivityTiming(timed('10:00', '12:00'), DAY, at('11:00')),
        ).toBe('current');
    });

    it('is past once now passes the end time', () => {
        expect(
            getActivityTiming(timed('10:00', '12:00'), DAY, at('13:00')),
        ).toBe('past');
    });

    it('accepts a full-ISO day key (slices to the date portion)', () => {
        expect(
            getActivityTiming(
                timed('10:00', '12:00'),
                `${DAY}T00:00:00`,
                at('11:00'),
            ),
        ).toBe('current');
    });

    describe('buildDateTime format branches', () => {
        it('anchors a no-time activity to midnight (both ends resolve)', () => {
            // undefined times default to "00:00:00" → midnight, so a no-time
            // activity is NOT null on a valid day: at noon it reads as past.
            expect(getActivityTiming(timed(undefined, undefined), DAY, at('12:00'))).toBe(
                'past',
            );
        });

        it('accepts HH:mm:ss anchors', () => {
            expect(
                getActivityTiming(timed('10:00:00', '12:00:00'), DAY, at('11:00')),
            ).toBe('current');
        });

        it('falls back to midnight for an unparseable, non-ISO time', () => {
            // "garbage" matches no time pattern and has no "T" → midnight.
            expect(getActivityTiming(timed('garbage', '12:00'), DAY, at('13:00'))).toBe(
                'past',
            );
        });
    });

    describe('single-point event (no parseable end)', () => {
        // A malformed, T-containing end string yields a null end Date, which is
        // what activates the instant-event grace window.
        const startOnly = timed('10:00', 'x-invalid-T');

        it('stays current within the 2h grace window', () => {
            expect(getActivityTiming(startOnly, DAY, at('11:00'))).toBe('current');
        });

        it('flips to past beyond the grace window', () => {
            expect(getActivityTiming(startOnly, DAY, at('13:00'))).toBe('past');
        });

        it('is upcoming before its start', () => {
            expect(getActivityTiming(startOnly, DAY, at('09:00'))).toBe(
                'upcoming',
            );
        });
    });
});

describe('getActivityProgress', () => {
    const timed = (
        startTime?: string,
        endTime?: string,
    ): TimedActivityInput => ({ startTime, endTime });

    it('returns null when a boundary is missing (empty day date)', () => {
        expect(getActivityProgress(timed('10:00', '12:00'), '', at('11:00'))).toBeNull();
    });

    it('returns null when end cannot be parsed', () => {
        expect(
            getActivityProgress(timed('10:00', 'x-invalid-T'), DAY, at('11:00')),
        ).toBeNull();
    });

    it('returns null for a non-positive duration', () => {
        expect(
            getActivityProgress(timed('12:00', '10:00'), DAY, at('11:00')),
        ).toBeNull();
    });

    it('clamps to 0 before the start', () => {
        expect(
            getActivityProgress(timed('10:00', '12:00'), DAY, at('09:00')),
        ).toBe(0);
    });

    it('clamps to 1 after the end', () => {
        expect(
            getActivityProgress(timed('10:00', '12:00'), DAY, at('13:00')),
        ).toBe(1);
    });

    it('returns the elapsed fraction mid-activity', () => {
        expect(
            getActivityProgress(timed('10:00', '12:00'), DAY, at('11:00')),
        ).toBeCloseTo(0.5, 5);
    });
});
