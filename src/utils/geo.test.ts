import { describe, it, expect } from 'vitest';
import type { Coordinates } from 'types';
import { haversineKm, KM_TO_MI } from './geo';

const at = (lat: number, lng: number): Coordinates => ({ lat, lng });

describe('haversineKm', () => {
    it('is 0 for identical points', () => {
        expect(haversineKm(at(40.7128, -74.006), at(40.7128, -74.006))).toBe(0);
    });

    it('matches one degree of longitude at the equator (~111 km)', () => {
        expect(haversineKm(at(0, 0), at(0, 1))).toBeCloseTo(111.19, 1);
    });

    it('matches one degree of latitude (~111 km)', () => {
        expect(haversineKm(at(0, 0), at(1, 0))).toBeCloseTo(111.19, 1);
    });

    it('is symmetric', () => {
        const a = at(51.5074, -0.1278); // London
        const b = at(48.8566, 2.3522); // Paris
        expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
    });

    it('computes a realistic long-haul distance (London -> Paris ~343 km)', () => {
        const km = haversineKm(at(51.5074, -0.1278), at(48.8566, 2.3522));
        expect(km).toBeGreaterThan(330);
        expect(km).toBeLessThan(355);
    });
});

describe('KM_TO_MI', () => {
    it('is the standard kilometre-to-mile factor', () => {
        expect(KM_TO_MI).toBe(0.621371);
    });
});
