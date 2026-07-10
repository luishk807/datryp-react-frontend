import { describe, it, expect } from 'vitest';
import { blendRatings, type RatingSourceInput } from './blendedRating';

describe('blendRatings', () => {
    it('returns null for an empty source list', () => {
        expect(blendRatings([])).toBeNull();
    });

    it('returns null when every rating is missing (null/undefined)', () => {
        expect(blendRatings([{ rating: null }, { rating: undefined }])).toBeNull();
        expect(blendRatings([{}, {}])).toBeNull();
    });

    it('treats a zero rating as absent (rating must be > 0)', () => {
        expect(blendRatings([{ rating: 0, count: 5 }])).toBeNull();
    });

    it('treats a negative rating as absent', () => {
        expect(blendRatings([{ rating: -3, count: 5 }])).toBeNull();
    });

    it('passes a single valid source straight through', () => {
        expect(blendRatings([{ rating: 4.5, count: 100 }])).toEqual({
            average: 4.5,
            totalCount: 100,
            sourceCount: 1,
        });
    });

    it('equal-weight averages multiple sources and sums their real counts', () => {
        expect(
            blendRatings([
                { rating: 4, count: 10 },
                { rating: 5, count: 20 },
            ])
        ).toEqual({ average: 4.5, totalCount: 30, sourceCount: 2 });
    });

    it('counts a source with no count as 0 toward totalCount but still averages it', () => {
        // First source (the OpenAI estimate) has no count: it lifts the mean
        // but adds nothing to the volume shown next to the stars.
        expect(
            blendRatings([
                { rating: 3 },
                { rating: 4, count: 5 },
                { rating: 5, count: 10 },
            ])
        ).toEqual({ average: 4, totalCount: 15, sourceCount: 3 });
    });

    it('treats a null count the same as a missing count', () => {
        expect(blendRatings([{ rating: 4, count: null }])).toEqual({
            average: 4,
            totalCount: 0,
            sourceCount: 1,
        });
    });

    it('excludes invalid sources from the average, count, and sourceCount', () => {
        const sources: RatingSourceInput[] = [
            { rating: 0, count: 999 }, // dropped: not > 0
            { rating: null, count: 50 }, // dropped: null
            { rating: 4, count: 10 }, // kept
        ];
        expect(blendRatings(sources)).toEqual({
            average: 4,
            totalCount: 10,
            sourceCount: 1,
        });
    });
});
