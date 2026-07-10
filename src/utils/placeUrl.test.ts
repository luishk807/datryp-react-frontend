import { describe, it, expect } from 'vitest';
import { placeDetailUrl } from './placeUrl';

describe('placeDetailUrl', () => {
    it('emits the go-direct form when city and country are known', () => {
        expect(placeDetailUrl('Louvre', 'Paris', 'France')).toBe(
            '/place?q=Louvre&city=Paris&country=France',
        );
    });

    it('trims whitespace from city and country', () => {
        expect(placeDetailUrl('Louvre', '  Paris  ', '  France  ')).toBe(
            '/place?q=Louvre&city=Paris&country=France',
        );
    });

    it('falls back to the legacy name-search form when both city and country are absent', () => {
        expect(placeDetailUrl('Louvre')).toBe('/place?q=Louvre&i=0');
    });

    it('falls back when only the city is provided', () => {
        expect(placeDetailUrl('Louvre', 'Paris')).toBe('/place?q=Louvre&i=0');
    });

    it('falls back when only the country is provided', () => {
        expect(placeDetailUrl('Louvre', null, 'France')).toBe('/place?q=Louvre&i=0');
    });

    it('falls back when city / country are whitespace-only', () => {
        expect(placeDetailUrl('Louvre', '   ', '   ')).toBe('/place?q=Louvre&i=0');
    });

    it('url-encodes the place name (spaces become +)', () => {
        expect(placeDetailUrl('Eiffel Tower', 'Paris', 'France')).toBe(
            '/place?q=Eiffel+Tower&city=Paris&country=France',
        );
    });

    it('url-encodes special characters in name and city', () => {
        expect(placeDetailUrl('Café & Bar', 'São Paulo', 'Brazil')).toBe(
            '/place?q=Caf%C3%A9+%26+Bar&city=S%C3%A3o+Paulo&country=Brazil',
        );
    });
});
