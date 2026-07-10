import { describe, it, expect } from 'vitest';
import { countryCodeToFlag } from './countryFlag';

describe('countryCodeToFlag', () => {
    it('maps a valid alpha-2 code to its regional-indicator flag emoji', () => {
        expect(countryCodeToFlag('US')).toBe('🇺🇸');
        expect(countryCodeToFlag('FR')).toBe('🇫🇷');
    });

    it('normalizes lowercase and whitespace before building the flag', () => {
        expect(countryCodeToFlag('fr')).toBe('🇫🇷');
        expect(countryCodeToFlag('  ca  ')).toBe('🇨🇦');
    });

    it('produces the correct pair of regional-indicator code points', () => {
        const flag = countryCodeToFlag('US');
        expect([...flag].map((ch) => ch.codePointAt(0))).toEqual([
            0x1f1fa, 0x1f1f8,
        ]);
    });

    it('falls back to a globe for null / undefined', () => {
        expect(countryCodeToFlag(null)).toBe('🌐');
        expect(countryCodeToFlag(undefined)).toBe('🌐');
    });

    it('falls back to a globe when the code is not exactly 2 chars', () => {
        expect(countryCodeToFlag('')).toBe('🌐');
        expect(countryCodeToFlag('U')).toBe('🌐');
        expect(countryCodeToFlag('USA')).toBe('🌐');
    });
});
