import { describe, it, expect } from 'vitest';
import { explorerLevel, type ExplorerLevelKey } from './explorerLevel';

// The tier boundaries drive the Atlas level badge; pin each threshold (and the
// row just below it) so a shifted cutoff can't slip through.
describe('explorerLevel', () => {
    it.each<[number, ExplorerLevelKey]>([
        [0, 'newExplorer'],
        [1, 'beginnerExplorer'],
        [5, 'beginnerExplorer'],
        [6, 'frequentTraveler'],
        [15, 'frequentTraveler'],
        [16, 'worldExplorer'],
        [30, 'worldExplorer'],
        [31, 'globeTrekker'],
        [60, 'globeTrekker'],
        [61, 'worldCitizen'],
        [500, 'worldCitizen'],
    ])('maps %i visited countries to "%s"', (count, levelKey) => {
        expect(explorerLevel(count).levelKey).toBe(levelKey);
    });

    it('returns an emoji for every tier', () => {
        for (const n of [0, 1, 6, 16, 31, 61]) {
            expect(explorerLevel(n).emoji).toBeTruthy();
        }
    });
});
