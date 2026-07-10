import { describe, it, expect } from 'vitest';
import { getPlaceKey } from './placeKey';

// getPlaceKey MUST stay byte-for-byte in sync with the backend's
// `slugify_place` (app/services/reviews.py) — the create-review endpoint
// recomputes the slug and rejects mismatches. These cases pin the slug
// algorithm so a drift on either side is caught in CI.
describe('getPlaceKey', () => {
    it('lowercases and joins the three parts with a double dash', () => {
        expect(getPlaceKey('Eiffel Tower', 'Paris', 'France')).toBe(
            'eiffel-tower--paris--france'
        );
    });

    it('collapses runs of non-alphanumerics (spaces, dots, quotes) to a single dash', () => {
        expect(getPlaceKey("St. John's  Pub!!", 'New York', 'USA')).toBe(
            'st-john-s-pub--new-york--usa'
        );
    });

    it('trims leading/trailing dashes produced by punctuation at the edges', () => {
        expect(getPlaceKey('  ¡Hola!  ', '—Berlin—', 'Germany')).toBe(
            'hola--berlin--germany'
        );
    });

    it('renders empty segments as empty (three empty parts join to four dashes)', () => {
        expect(getPlaceKey('', '', '')).toBe('----');
    });

    it('is deterministic — same input always yields the same key', () => {
        const a = getPlaceKey('Machu Picchu', 'Cusco', 'Peru');
        const b = getPlaceKey('Machu Picchu', 'Cusco', 'Peru');
        expect(a).toBe(b);
    });
});
