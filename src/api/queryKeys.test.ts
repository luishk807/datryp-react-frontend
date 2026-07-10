import { describe, it, expect } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
    it('exposes stable static keys', () => {
        expect(queryKeys.me).toEqual(['me']);
        expect(queryKeys.currentUser).toEqual(['python-auth', 'me']);
        expect(queryKeys.trips.all).toEqual(['trips']);
        expect(queryKeys.friends).toEqual(['friends']);
    });

    it('builds trips.list with a filter, defaulting to "all"', () => {
        expect(queryKeys.trips.list()).toEqual(['trips', 'list', 'all']);
        expect(queryKeys.trips.list('past')).toEqual([
            'trips',
            'list',
            'past',
        ]);
    });

    it('builds trips.detail from a numeric or string id', () => {
        expect(queryKeys.trips.detail(42)).toEqual(['trips', 'detail', 42]);
        expect(queryKeys.trips.detail('abc')).toEqual([
            'trips',
            'detail',
            'abc',
        ]);
    });

    it('builds recommendations.countries from the query', () => {
        expect(queryKeys.recommendations.countries('japan')).toEqual([
            'recommendations',
            'countries',
            'japan',
        ]);
    });
});
