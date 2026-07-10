import { describe, it, expect } from 'vitest';
import type { Destination } from 'types';
import { deriveDestinationRanges } from './destinations';

const dest = (
    id: number,
    startDate?: string,
    endDate?: string,
): Destination =>
    ({
        id,
        country: { id: 1, name: 'Country' },
        itinerary: [],
        startDate,
        endDate,
    } as Destination);

describe('deriveDestinationRanges', () => {
    it('returns an empty array for empty input', () => {
        expect(deriveDestinationRanges([])).toEqual([]);
    });

    it('leaves a destination without a startDate untouched', () => {
        const d = dest(1);
        const [out] = deriveDestinationRanges([d]);
        expect(out.endDate).toBeUndefined();
    });

    it('fills a lone destination endDate from the trip end when it is not before start', () => {
        const [out] = deriveDestinationRanges([dest(1, '2026-01-01')], '2026-01-10');
        expect(out.endDate).toBe('2026-01-10');
    });

    it('falls back to the existing endDate when the trip end is before start', () => {
        const [out] = deriveDestinationRanges(
            [dest(1, '2026-01-05', '2026-01-08')],
            '2026-01-01',
        );
        expect(out.endDate).toBe('2026-01-08');
    });

    it('falls back to start when there is no trip end and no existing endDate', () => {
        const [out] = deriveDestinationRanges([dest(1, '2026-01-05')]);
        expect(out.endDate).toBe('2026-01-05');
    });

    it('sets each destination end to the day before the next destination starts', () => {
        const out = deriveDestinationRanges(
            [dest(1, '2026-01-01'), dest(2, '2026-01-05')],
            '2026-01-10',
        );
        expect(out[0].endDate).toBe('2026-01-04');
        expect(out[1].endDate).toBe('2026-01-10');
    });

    it('preserves input (array position) order while resolving neighbors chronologically', () => {
        // Input is out of chronological order: id 2 (later) comes first.
        const out = deriveDestinationRanges(
            [dest(2, '2026-01-05'), dest(1, '2026-01-01')],
            '2026-01-10',
        );
        expect(out.map((d) => d.id)).toEqual([2, 1]);
        // id 1 is chronologically first -> ends day before id 2's start.
        expect(out.find((d) => d.id === 1)?.endDate).toBe('2026-01-04');
        // id 2 is chronologically last -> ends at trip end.
        expect(out.find((d) => d.id === 2)?.endDate).toBe('2026-01-10');
    });

    it('never produces an end before start when the successor starts the same day', () => {
        const out = deriveDestinationRanges(
            [dest(1, '2026-01-05'), dest(2, '2026-01-05')],
            '2026-01-10',
        );
        // Same-day successor: guard collapses the first end back to its start.
        expect(out[0].endDate).toBe('2026-01-05');
    });

    it('ignores destinations without a startDate while ranging the rest', () => {
        const out = deriveDestinationRanges(
            [dest(1, '2026-01-01'), dest(2), dest(3, '2026-01-05')],
            '2026-01-10',
        );
        expect(out.find((d) => d.id === 2)?.endDate).toBeUndefined();
        expect(out.find((d) => d.id === 1)?.endDate).toBe('2026-01-04');
        expect(out.find((d) => d.id === 3)?.endDate).toBe('2026-01-10');
    });
});
