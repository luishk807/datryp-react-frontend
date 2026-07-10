import { describe, it, expect } from 'vitest';
import {
    MIN_SIGNUP_AGE,
    MAX_BIRTH_YEAR,
    MIN_BIRTH_YEAR,
    yearsSinceBirthYear,
} from './age';

// COPPA age gate — must agree with the backend rule in app/schemas/auth.py.
describe('yearsSinceBirthYear', () => {
    const thisYear = new Date().getFullYear();

    it('returns the calendar-year difference for a valid birth year', () => {
        expect(yearsSinceBirthYear(thisYear - 25)).toBe(25);
    });

    it('treats someone born exactly MIN_SIGNUP_AGE years ago as qualifying', () => {
        expect(yearsSinceBirthYear(MAX_BIRTH_YEAR)).toBe(MIN_SIGNUP_AGE);
    });

    it.each([null, undefined, NaN, 1.5])(
        'returns 0 for non-integer / missing input (%s)',
        (value) => {
            expect(yearsSinceBirthYear(value as number)).toBe(0);
        }
    );

    it('returns 0 for out-of-range years (before 1900 or in the future)', () => {
        expect(yearsSinceBirthYear(1899)).toBe(0);
        expect(yearsSinceBirthYear(thisYear + 1)).toBe(0);
    });

    it('accepts the earliest allowed birth year', () => {
        expect(yearsSinceBirthYear(MIN_BIRTH_YEAR)).toBe(thisYear - MIN_BIRTH_YEAR);
    });

    it('MAX_BIRTH_YEAR is exactly MIN_SIGNUP_AGE years before now', () => {
        expect(MAX_BIRTH_YEAR).toBe(thisYear - MIN_SIGNUP_AGE);
    });
});
