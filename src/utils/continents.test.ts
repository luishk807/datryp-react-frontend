import { describe, it, expect } from 'vitest';
import {
    CONTINENT_LABEL,
    CONTINENT_COUNTRIES,
    CONTINENT_TOTAL,
    continentForCode,
    continentMembers,
    type ContinentKey,
} from './continents';

const ALL_KEYS: ContinentKey[] = [
    'africa',
    'asia',
    'europe',
    'north_america',
    'central_america',
    'south_america',
    'oceania',
];

describe('continentForCode', () => {
    it('resolves representative codes to the right continent', () => {
        expect(continentForCode('US')).toBe('north_america');
        expect(continentForCode('BR')).toBe('south_america');
        expect(continentForCode('DE')).toBe('europe');
        expect(continentForCode('JP')).toBe('asia');
        expect(continentForCode('ZA')).toBe('africa');
        expect(continentForCode('AU')).toBe('oceania');
        expect(continentForCode('PA')).toBe('central_america');
    });

    it('applies the trans-continental assignments by convention', () => {
        expect(continentForCode('RU')).toBe('europe');
        expect(continentForCode('TR')).toBe('asia');
        expect(continentForCode('CY')).toBe('europe');
        expect(continentForCode('KZ')).toBe('asia');
    });

    it('uppercases the input before lookup', () => {
        expect(continentForCode('us')).toBe('north_america');
        expect(continentForCode('br')).toBe('south_america');
    });

    it('returns null for null / undefined / empty input', () => {
        expect(continentForCode(null)).toBeNull();
        expect(continentForCode(undefined)).toBeNull();
        expect(continentForCode('')).toBeNull();
    });

    it('returns null for an unknown code', () => {
        expect(continentForCode('ZZ')).toBeNull();
        expect(continentForCode('XX')).toBeNull();
    });
});

describe('continent tables', () => {
    it('exposes a label for every continent key', () => {
        for (const key of ALL_KEYS) {
            expect(CONTINENT_LABEL[key]).toBeTruthy();
        }
        expect(CONTINENT_LABEL.south_america).toBe('South America');
    });

    it('keeps CONTINENT_TOTAL in sync with the membership list lengths', () => {
        for (const key of ALL_KEYS) {
            expect(CONTINENT_TOTAL[key]).toBe(CONTINENT_COUNTRIES[key].length);
        }
    });

    it('has no country assigned to more than one continent', () => {
        const seen = new Set<string>();
        for (const key of ALL_KEYS) {
            for (const code of CONTINENT_COUNTRIES[key]) {
                expect(seen.has(code)).toBe(false);
                seen.add(code);
            }
        }
    });
});

describe('continentMembers', () => {
    it('returns a Set of the continent members sized to the total', () => {
        const europe = continentMembers('europe');
        expect(europe).toBeInstanceOf(Set);
        expect(europe.has('RU')).toBe(true);
        expect(europe.has('US')).toBe(false);
        expect(europe.size).toBe(CONTINENT_TOTAL.europe);
    });
});
