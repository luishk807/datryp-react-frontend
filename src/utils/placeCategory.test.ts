import { describe, it, expect } from 'vitest';
import { placeCategoryFor } from './placeCategory';

describe('placeCategoryFor', () => {
    it('classifies dining venues and meal names as restaurant', () => {
        expect(placeCategoryFor('Dinner Reservation')).toBe('restaurant');
        expect(placeCategoryFor('Ramen Shop')).toBe('restaurant');
        expect(placeCategoryFor('Coffee House')).toBe('restaurant');
        // "Bar" must lose to restaurant when a food word precedes it.
        expect(placeCategoryFor('Noodle Bar')).toBe('restaurant');
    });

    it('classifies coast keywords as beach', () => {
        expect(placeCategoryFor('Beach Day')).toBe('beach');
        expect(placeCategoryFor('Seaside Walk')).toBe('beach');
    });

    it('classifies trails and peaks as hike', () => {
        expect(placeCategoryFor('Trail Run')).toBe('hike');
        expect(placeCategoryFor('Volcano Tour')).toBe('hike');
    });

    it('classifies museums and galleries as museum', () => {
        expect(placeCategoryFor('History Museum')).toBe('museum');
        expect(placeCategoryFor('Art Gallery')).toBe('museum');
    });

    it('classifies classic sights as attraction', () => {
        expect(placeCategoryFor('Zoo Visit')).toBe('attraction');
        expect(placeCategoryFor('Grand Bazaar')).toBe('attraction');
        expect(placeCategoryFor('Eiffel Tower')).toBe('attraction');
        expect(placeCategoryFor('Night Market')).toBe('attraction');
        expect(placeCategoryFor('Central Park')).toBe('attraction');
    });

    it('falls back to universal when nothing matches', () => {
        expect(placeCategoryFor('Spa Day')).toBe('universal');
        expect(placeCategoryFor('Concert Night')).toBe('universal');
    });

    it('returns universal for empty / blank / undefined names', () => {
        expect(placeCategoryFor('')).toBe('universal');
        expect(placeCategoryFor('   ')).toBe('universal');
        // Runtime-guarded even though the signature is `string`.
        expect(placeCategoryFor(undefined as unknown as string)).toBe(
            'universal'
        );
    });

    it('resolves in rule order — restaurant wins over beach when both match', () => {
        expect(placeCategoryFor('Beach Restaurant')).toBe('restaurant');
    });
});
