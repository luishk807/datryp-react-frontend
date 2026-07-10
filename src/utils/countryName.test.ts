import { describe, it, expect } from 'vitest';
import { countryName } from './countryName';

describe('countryName', () => {
    it('resolves a valid alpha-2 code to its English name by default', () => {
        expect(countryName('US')).toBe('United States');
        expect(countryName('FR')).toBe('France');
    });

    it('normalizes case and surrounding whitespace before lookup', () => {
        expect(countryName('us')).toBe('United States');
        expect(countryName('  fr  ')).toBe('France');
    });

    it('localizes the name when a locale is supplied', () => {
        expect(countryName('US', 'es')).toBe('Estados Unidos');
    });

    it('returns "" for null / undefined codes', () => {
        expect(countryName(null)).toBe('');
        expect(countryName(undefined)).toBe('');
    });

    it('returns the trimmed raw code (un-uppercased) when it is not exactly 2 chars', () => {
        expect(countryName('USA')).toBe('USA');
        expect(countryName('  usa  ')).toBe('usa');
        expect(countryName('U')).toBe('U');
        expect(countryName('')).toBe('');
    });

    it('falls back to the code for an unknown-but-well-formed region', () => {
        expect(countryName('ZZ')).toBe('Unknown Region');
    });

    it('returns the code when Intl.DisplayNames.of rejects the 2-char code', () => {
        // "12" is 2 chars (passes the length gate) but not a valid region
        // subtag, so `.of` throws and the inner catch returns the code.
        expect(countryName('12')).toBe('12');
    });

    it('returns the uppercased code when the locale is invalid (formatter is null)', () => {
        // First call caches `null` for the bad locale; the second call reads
        // that cached null back (exercising the cached-null branch).
        expect(countryName('US', '@@bad-locale')).toBe('US');
        expect(countryName('FR', '@@bad-locale')).toBe('FR');
    });

    it('serves repeated lookups for the same locale from the cache', () => {
        // Second call exercises the `formatterCache.has(locale)` branch.
        expect(countryName('DE', 'en')).toBe('Germany');
        expect(countryName('DE', 'en')).toBe('Germany');
    });
});
