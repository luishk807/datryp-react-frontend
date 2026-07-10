import { describe, it, expect } from 'vitest';
import { getUserFirstName } from './userName';

describe('getUserFirstName', () => {
    it('returns the default fallback for null / undefined users', () => {
        expect(getUserFirstName(null)).toBe('traveler');
        expect(getUserFirstName(undefined)).toBe('traveler');
    });

    it('honors a custom fallback', () => {
        expect(getUserFirstName(null, 'friend')).toBe('friend');
    });

    it('takes the first whitespace-delimited token of the name and capitalizes it', () => {
        expect(getUserFirstName({ name: 'Luis Hernandez' })).toBe('Luis');
        expect(getUserFirstName({ name: 'luis' })).toBe('Luis');
    });

    it('keeps a hyphenated compound first name glued together', () => {
        expect(getUserFirstName({ name: 'jean-luc picard' })).toBe('Jean-luc');
    });

    it('preserves non-ASCII first letters', () => {
        expect(getUserFirstName({ name: 'maría' })).toBe('María');
    });

    it('falls back to the email local part when name is blank', () => {
        expect(
            getUserFirstName({ name: '   ', email: 'luis.hk@example.com' })
        ).toBe('Luis');
    });

    it('strips separators and digits out of the email local part', () => {
        expect(getUserFirstName({ email: 'john123@x.com' })).toBe('John');
        expect(getUserFirstName({ email: 'a.b.c@x.com' })).toBe('A');
    });

    it('falls back when the email local part cleans down to nothing', () => {
        // "123" -> digits stripped -> empty -> return fallback.
        expect(getUserFirstName({ email: '123@x.com' })).toBe('traveler');
        expect(getUserFirstName({ email: '123@x.com' }, 'guest')).toBe('guest');
    });

    it('falls back when both name and email are missing / blank', () => {
        expect(getUserFirstName({})).toBe('traveler');
        expect(getUserFirstName({ name: null, email: null })).toBe('traveler');
        expect(getUserFirstName({ name: '  ', email: '  ' })).toBe('traveler');
    });
});
