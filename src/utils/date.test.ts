import { describe, it, expect } from 'vitest';
import {
    formatDate,
    now,
    tomorrow,
    isSameDay,
    isAfter,
    isBefore,
    isValidDate,
    addDays,
    diffDays,
    reformatDate,
} from './date';

// Local YYYY-MM-DD offset from today (avoids UTC boundary flakiness that a
// toISOString().slice() would introduce near midnight).
const isoDaysFromNow = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe('formatDate', () => {
    it('formats an ISO string with the default YYYY-MM-DD format', () => {
        expect(formatDate('2026-01-05')).toBe('2026-01-05');
    });

    it('honors a custom format', () => {
        expect(formatDate('2026-01-05', 'YYYY')).toBe('2026');
        expect(formatDate('2026-01-05', 'MM/DD/YYYY')).toBe('01/05/2026');
    });

    it('formats a Date object', () => {
        expect(formatDate(new Date('2026-03-14T00:00:00'))).toBe('2026-03-14');
    });

    it('falls back to now for null / undefined', () => {
        expect(formatDate(null)).toBe(now());
        expect(formatDate(undefined)).toBe(now());
    });
});

describe('now', () => {
    it('returns today in the default format', () => {
        expect(now()).toBe(isoDaysFromNow(0));
        expect(now()).toMatch(ISO);
    });

    it('honors a custom format', () => {
        expect(now('YYYY')).toBe(String(new Date().getFullYear()));
    });
});

describe('tomorrow', () => {
    it('returns the day after today', () => {
        expect(tomorrow()).toBe(isoDaysFromNow(1));
    });

    it('honors a custom format', () => {
        expect(tomorrow('YYYY-MM-DD')).toMatch(ISO);
    });
});

describe('isSameDay', () => {
    it('is true for two values on the same calendar day (ignoring time)', () => {
        expect(isSameDay('2026-01-05', '2026-01-05T23:00:00')).toBe(true);
    });

    it('is false for different days', () => {
        expect(isSameDay('2026-01-05', '2026-01-06')).toBe(false);
    });

    it('treats null / undefined as now (both sides equal)', () => {
        expect(isSameDay(null, undefined)).toBe(true);
    });
});

describe('isAfter', () => {
    it('is true when a is strictly after b', () => {
        expect(isAfter('2026-01-06', '2026-01-05')).toBe(true);
    });

    it('is false when a is before or equal to b', () => {
        expect(isAfter('2026-01-05', '2026-01-06')).toBe(false);
        expect(isAfter('2026-01-05T10:00:00', '2026-01-05T10:00:00')).toBe(false);
    });
});

describe('isBefore', () => {
    it('is true when a is strictly before b', () => {
        expect(isBefore('2026-01-05', '2026-01-06')).toBe(true);
    });

    it('is false when a is after or equal to b', () => {
        expect(isBefore('2026-01-06', '2026-01-05')).toBe(false);
        expect(isBefore('2026-01-05T10:00:00', '2026-01-05T10:00:00')).toBe(false);
    });
});

describe('isValidDate', () => {
    it('is true for a valid ISO date', () => {
        expect(isValidDate('2026-01-05')).toBe(true);
    });

    it('is false for garbage input', () => {
        expect(isValidDate('not-a-date')).toBe(false);
    });

    it('is true for null / undefined (parses as now)', () => {
        expect(isValidDate(null)).toBe(true);
        expect(isValidDate(undefined)).toBe(true);
    });

    it('uses an explicit input format when provided', () => {
        expect(isValidDate('14:30', 'HH:mm')).toBe(true);
    });
});

describe('addDays', () => {
    it('adds days and formats the result', () => {
        expect(addDays('2026-01-05', 1)).toBe('2026-01-06');
    });

    it('subtracts with a negative count', () => {
        expect(addDays('2026-01-05', -1)).toBe('2026-01-04');
    });

    it('rolls over month boundaries', () => {
        expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    });

    it('honors a custom output format', () => {
        expect(addDays('2026-01-05', 1, 'MM/DD')).toBe('01/06');
    });
});

describe('diffDays', () => {
    it('is positive when to is later than from', () => {
        expect(diffDays('2026-01-05', '2026-01-08')).toBe(3);
    });

    it('is negative when to is earlier than from', () => {
        expect(diffDays('2026-01-08', '2026-01-05')).toBe(-3);
    });

    it('is zero for the same day (time parts ignored)', () => {
        expect(diffDays('2026-01-05T01:00:00', '2026-01-05T23:00:00')).toBe(0);
    });
});

describe('reformatDate', () => {
    it('parses with the input format and formats with the default output', () => {
        expect(reformatDate('01/05/2026', 'MM/DD/YYYY')).toBe('2026-01-05');
    });

    it('honors a custom output format', () => {
        expect(reformatDate('14:30', 'HH:mm', 'HH')).toBe('14');
    });
});

// The comparison wrappers coalesce a nullish operand to a "now" reference that
// is shared across both operands of a single call. So when BOTH operands are
// nullish they resolve to the exact same instant (equal) — never "before" or
// "after". This used to read the clock twice (moment() per operand), which made
// isBefore(null, undefined) flakily true whenever the two reads landed in
// different milliseconds. Every nullish combo must be deterministically equal.
describe('nullish inputs coalesce to a single shared now', () => {
    it('isAfter treats both-nullish as equal (not after) for every combo', () => {
        expect(isAfter(null, undefined)).toBe(false);
        expect(isAfter(undefined, null)).toBe(false);
        expect(isAfter(null, null)).toBe(false);
        expect(isAfter(undefined, undefined)).toBe(false);
    });

    it('isBefore treats both-nullish as equal (not before) for every combo', () => {
        expect(isBefore(null, undefined)).toBe(false);
        expect(isBefore(undefined, null)).toBe(false);
        expect(isBefore(null, null)).toBe(false);
        expect(isBefore(undefined, undefined)).toBe(false);
    });

    it('isSameDay is true and diffDays is 0 for both-nullish operands', () => {
        expect(isSameDay(null, undefined)).toBe(true);
        expect(diffDays(null, undefined)).toBe(0);
    });

    it('isValidDate is false for a null value when an input format is required', () => {
        // moment(undefined, format) parses as Invalid (format needs a string).
        expect(isValidDate(null, 'HH:mm')).toBe(false);
    });

    it('addDays adds to today when the value is null', () => {
        expect(addDays(null, 1)).toBe(isoDaysFromNow(1));
    });

    it('reformatDate yields "Invalid date" for a nullish value with an input format', () => {
        expect(reformatDate(undefined, 'HH:mm', 'YYYY')).toBe('Invalid date');
    });
});
