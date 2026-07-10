import { describe, it, expect } from 'vitest';
import moment from 'moment';
import { parseFlightInfo } from './parseFlightInfo';

const today = (): string => moment().startOf('day').format('YYYY-MM-DD');
const tomorrow = (): string =>
    moment().add(1, 'day').startOf('day').format('YYYY-MM-DD');
const yesterday = (): string =>
    moment().subtract(1, 'day').startOf('day').format('YYYY-MM-DD');
const curYear = (): number => moment().year();

describe('parseFlightInfo — empty / unparseable input', () => {
    it('returns an empty segment list for undefined', () => {
        expect(parseFlightInfo(undefined)).toEqual({ segments: [] });
    });

    it('returns an empty segment list for the empty string', () => {
        expect(parseFlightInfo('')).toEqual({ segments: [] });
    });

    it('returns an empty segment list for whitespace only', () => {
        expect(parseFlightInfo('   ')).toEqual({ segments: [] });
    });

    it('returns no flight number and no segments for plain prose', () => {
        expect(parseFlightInfo('hello world')).toEqual({
            flightNumber: undefined,
            departDate: undefined,
            segments: [],
        });
    });
});

describe('parseFlightInfo — single leg, flight number only', () => {
    it('parses a compact "UA123"', () => {
        const r = parseFlightInfo('UA123');
        expect(r.flightNumber).toBe('UA123');
        expect(r.departDate).toBeUndefined();
        expect(r.segments).toEqual([
            { flightNumber: 'UA123', departDate: undefined },
        ]);
    });

    it('collapses the space in "UA 123"', () => {
        expect(parseFlightInfo('UA 123').flightNumber).toBe('UA123');
    });

    it('uppercases a lowercase code', () => {
        expect(parseFlightInfo('ua123').flightNumber).toBe('UA123');
    });

    it('recognizes a carrier code with a digit (letter+digit)', () => {
        expect(parseFlightInfo('B6123').flightNumber).toBe('B6123');
    });

    it('recognizes a carrier code with a leading digit (digit+letter)', () => {
        expect(parseFlightInfo('9W5').flightNumber).toBe('9W5');
    });

    it('allows a trailing letter on the numeric portion', () => {
        expect(parseFlightInfo('BA245A').flightNumber).toBe('BA245A');
    });
});

describe('parseFlightInfo — single leg with a date', () => {
    it('resolves the "today" keyword', () => {
        const r = parseFlightInfo('UA123 today');
        expect(r.flightNumber).toBe('UA123');
        expect(r.departDate).toBe(today());
    });

    it('resolves "tomorrow" anywhere in the sentence', () => {
        const r = parseFlightInfo('my flight is BA245 tomorrow');
        expect(r.flightNumber).toBe('BA245');
        expect(r.departDate).toBe(tomorrow());
    });

    it('resolves "yesterday"', () => {
        expect(parseFlightInfo('UA123 yesterday').departDate).toBe(
            yesterday(),
        );
    });

    it('resolves "tonight" to today', () => {
        expect(parseFlightInfo('UA123 tonight').departDate).toBe(today());
    });

    it('parses an embedded ISO date via the strict format loop', () => {
        const r = parseFlightInfo('UA123 2026-08-15');
        expect(r.flightNumber).toBe('UA123');
        expect(r.departDate).toBe('2026-08-15');
    });

    it('parses a numeric M/D date (assumes current year)', () => {
        expect(parseFlightInfo('UA123 8/15').departDate).toBe(
            `${curYear()}-08-15`,
        );
    });

    it('parses a full month-name date with a year', () => {
        expect(parseFlightInfo('UA123 August 15 2026').departDate).toBe(
            '2026-08-15',
        );
    });

    it('parses a full month-name date without a year (current year)', () => {
        expect(parseFlightInfo('UA123 August 15').departDate).toBe(
            `${curYear()}-08-15`,
        );
    });

    it('does not treat "todays" as the today keyword', () => {
        // Word-boundary guard — "todays" must not resolve to a date.
        expect(parseFlightInfo('UA123 todays plan').departDate).toBeUndefined();
    });

    it('ignores a numeric token that is not a valid calendar date', () => {
        // "99/99" matches the numeric shape but no M/D format accepts it.
        expect(parseFlightInfo('UA123 99/99').departDate).toBeUndefined();
    });
});

describe('parseFlightInfo — no flight number but a date is present', () => {
    it('exposes a keyword-only date as a dateless segment', () => {
        const r = parseFlightInfo('today');
        expect(r.flightNumber).toBeUndefined();
        expect(r.departDate).toBe(today());
        expect(r.segments).toEqual([{ departDate: today() }]);
    });

    it('exposes a numeric-only date fallback', () => {
        const r = parseFlightInfo('leaving 8/15');
        expect(r.flightNumber).toBeUndefined();
        expect(r.departDate).toBe(`${curYear()}-08-15`);
        expect(r.segments).toHaveLength(1);
    });

    it('parses a bare ISO date string', () => {
        expect(parseFlightInfo('2026-08-15').departDate).toBe('2026-08-15');
    });

    it('recovers an ISO date embedded in a longer phrase', () => {
        const r = parseFlightInfo('arriving 2026-08-15 evening');
        expect(r.flightNumber).toBeUndefined();
        expect(r.departDate).toBe('2026-08-15');
    });
});

describe('parseFlightInfo — multi-leg splitting', () => {
    it('splits two legs and binds each date to its leg', () => {
        const r = parseFlightInfo('UA123 today then DL900 tomorrow');
        expect(r.segments).toHaveLength(2);
        expect(r.segments[0]).toEqual({
            flightNumber: 'UA123',
            departDate: today(),
        });
        expect(r.segments[1]).toEqual({
            flightNumber: 'DL900',
            departDate: tomorrow(),
        });
        // Convenience accessors mirror the first leg.
        expect(r.flightNumber).toBe('UA123');
        expect(r.departDate).toBe(today());
    });

    it('absorbs connector words and leaves undefined dates when none given', () => {
        const r = parseFlightInfo('UA123 -> BA245');
        expect(r.segments.map((s) => s.flightNumber)).toEqual([
            'UA123',
            'BA245',
        ]);
        expect(r.segments[0].departDate).toBeUndefined();
        expect(r.segments[1].departDate).toBeUndefined();
    });

    it('binds a leading date to the first leg (text before the match)', () => {
        const r = parseFlightInfo('tomorrow UA123 stopover BA245');
        expect(r.segments).toHaveLength(2);
        expect(r.segments[0].departDate).toBe(tomorrow());
        expect(r.segments[1].departDate).toBeUndefined();
        expect(r.departDate).toBe(tomorrow());
    });
});
