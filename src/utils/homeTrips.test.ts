import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { ApiItinerary } from 'api/hooks/useItineraries';
import type { TripBoxData } from 'components/common/TripBox';

// `selectInProgressTrips` runs each API row through `apiToTripEntry`. Mock the
// adapter to an identity fn so the tests feed it already-shaped entries and
// assert only the selector's own filter/sort logic.
vi.mock('utils/itineraryAdapter', () => ({
    apiToTripEntry: vi.fn(),
}));

import { apiToTripEntry } from 'utils/itineraryAdapter';
import {
    selectInProgressTrips,
    tripPrimaryCountry,
    formatTripDateRange,
} from './homeTrips';

const entry = (status: string, startDate?: string, apiId = 's') =>
    ({ status: { name: status }, startDate, apiId }) as unknown as ApiItinerary;

beforeEach(() => {
    (apiToTripEntry as unknown as Mock).mockImplementation(
        (it: ApiItinerary) => it,
    );
});

describe('selectInProgressTrips', () => {
    it('returns [] for undefined / empty input', () => {
        expect(selectInProgressTrips(undefined)).toEqual([]);
        expect(selectInProgressTrips([])).toEqual([]);
    });

    it('keeps only Planning + Confirmed trips', () => {
        const out = selectInProgressTrips([
            entry('Planning', '2026-03-01', 'a'),
            entry('Confirmed', '2026-03-02', 'b'),
            entry('Completed', '2026-03-03', 'c'),
            entry('Cancelled', '2026-03-04', 'd'),
        ]);
        expect(out.map((t) => t.apiId)).toEqual(['a', 'b']);
    });

    it('sorts Planning before Confirmed regardless of date', () => {
        const out = selectInProgressTrips([
            entry('Confirmed', '2026-01-01', 'confirmed'),
            entry('Planning', '2026-12-01', 'planning'),
        ]);
        expect(out.map((t) => t.apiId)).toEqual(['planning', 'confirmed']);
    });

    it('sorts soonest-start first within a status group', () => {
        const out = selectInProgressTrips([
            entry('Planning', '2026-05-01', 'may'),
            entry('Planning', '2026-02-01', 'feb'),
        ]);
        expect(out.map((t) => t.apiId)).toEqual(['feb', 'may']);
    });

    it('sinks dateless trips to the end of their group', () => {
        const out = selectInProgressTrips([
            entry('Planning', undefined, 'nodate'),
            entry('Planning', '2026-02-01', 'feb'),
        ]);
        expect(out.map((t) => t.apiId)).toEqual(['feb', 'nodate']);
    });

    it('is case-insensitive on the status name', () => {
        const out = selectInProgressTrips([entry('planning', '2026-02-01', 'x')]);
        expect(out.map((t) => t.apiId)).toEqual(['x']);
    });
});

describe('tripPrimaryCountry', () => {
    it('reads the country off a single-destination trip', () => {
        const single = {
            country: { id: 1, name: 'Japan', code: 'JP' },
        } as unknown as TripBoxData;
        expect(tripPrimaryCountry(single)).toEqual({ name: 'Japan', code: 'JP' });
    });

    it('reads the first leg country off a multi-destination trip', () => {
        const multi = {
            intenaryDates: [{ country: { name: 'Peru', code: 'PE' } }],
        } as unknown as TripBoxData;
        expect(tripPrimaryCountry(multi)).toEqual({ name: 'Peru', code: 'PE' });
    });

    it('maps empty name/code to undefined', () => {
        const single = {
            country: { id: 1, name: '', code: '' },
        } as unknown as TripBoxData;
        expect(tripPrimaryCountry(single)).toEqual({
            name: undefined,
            code: undefined,
        });
    });

    it('returns undefined fields for a multi trip with no legs', () => {
        const multi = { intenaryDates: [] } as unknown as TripBoxData;
        expect(tripPrimaryCountry(multi)).toEqual({
            name: undefined,
            code: undefined,
        });
    });
});

describe('formatTripDateRange', () => {
    it('returns empty string when either date is invalid', () => {
        expect(formatTripDateRange('', '2026-03-09')).toBe('');
        expect(formatTripDateRange('2026-03-03', 'nope')).toBe('');
    });

    it('formats a same-year range compactly', () => {
        expect(formatTripDateRange('2026-03-03', '2026-03-09')).toBe(
            'Mar 3 – Mar 9, 2026',
        );
    });

    it('includes both years for a cross-year range', () => {
        expect(formatTripDateRange('2025-12-30', '2026-01-02')).toBe(
            'Dec 30, 2025 – Jan 2, 2026',
        );
    });
});
