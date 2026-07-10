import { describe, it, expect } from 'vitest';
import { enrichBucketGoal } from './bucketGoalEnrich';

describe('enrichBucketGoal', () => {
    it('falls back to the travel default when no themed keyword matches', () => {
        const out = enrichBucketGoal('visit norway');
        expect(out).toEqual({ emoji: '✈️', tags: ['Destination'] });
    });

    it('returns the default for empty text', () => {
        expect(enrichBucketGoal('')).toEqual({ emoji: '✈️', tags: ['Destination'] });
    });

    it('matches a single category and takes its emoji', () => {
        const out = enrichBucketGoal('see the northern lights');
        expect(out.emoji).toBe('🌌');
        expect(out.tags).toEqual(['Aurora']);
    });

    it('is case-insensitive', () => {
        const out = enrichBucketGoal('SEE THE AURORA');
        expect(out.emoji).toBe('🌌');
        expect(out.tags).toEqual(['Aurora']);
    });

    it('takes the emoji from the FIRST (most specific) matched category', () => {
        // "sumo" is Sports (index 3); "beach" is Beach (index 8). Sports wins
        // the emoji because it appears earlier in CATEGORIES.
        const out = enrichBucketGoal('watch a sumo match then hit the beach');
        expect(out.emoji).toBe('⚽');
        expect(out.tags).toEqual(['Sports', 'Beach']);
    });

    it('matches leading-space keywords like "fc " at the start of the string', () => {
        const out = enrichBucketGoal('fc barcelona game');
        expect(out.emoji).toBe('⚽');
        expect(out.tags).toEqual(['Sports']);
    });

    it('matches "eat " padded keyword at the very start', () => {
        const out = enrichBucketGoal('eat ramen in tokyo');
        expect(out.emoji).toBe('🍴');
        expect(out.tags).toEqual(['Foodie']);
    });

    it('caps at three tags even when more categories match', () => {
        // safari→Wildlife, beach→Beach, food→Foodie, festival→Festival,
        // temple→Culture — five hits, but only the first three are kept.
        const out = enrichBucketGoal('safari, beach, food, festival, temple tour');
        expect(out.tags).toEqual(['Wildlife', 'Beach', 'Foodie']);
        expect(out.tags).toHaveLength(3);
        expect(out.emoji).toBe('🦁');
    });

    it('collapses duplicate keyword hits within one category to a single tag', () => {
        // "sushi" and "food" both live in Foodie — one category, one tag.
        const out = enrichBucketGoal('food and sushi crawl');
        expect(out.tags).toEqual(['Foodie']);
    });

    it('matches accented keyword variants', () => {
        const out = enrichBucketGoal('watch el clásico live');
        expect(out.tags).toEqual(['Sports']);
        expect(out.emoji).toBe('⚽');
    });

    it('matches the hot-air-balloon misspelling variant', () => {
        const out = enrichBucketGoal('ride a hot air ballon over cappadocia');
        expect(out.emoji).toBe('🎈');
        expect(out.tags).toEqual(['Hot air balloon']);
    });

    it('maps the last category (City) when only it matches', () => {
        const out = enrichBucketGoal('see the skyline downtown');
        expect(out.emoji).toBe('🏙');
        expect(out.tags).toEqual(['City']);
    });

    it('exercises a spread of distinct categories with expected emojis', () => {
        const cases: Array<[string, string, string]> = [
            ['go on a safari', '🦁', 'Wildlife'],
            ['ski the alps', '🎿', 'Ski'],
            ['hike machu picchu', '🥾', 'Hiking'],
            ['scuba dive the reef', '🤿', 'Diving'],
            ['relax at the beach', '🏖', 'Beach'],
            ['oktoberfest in munich', '🎉', 'Festival'],
            ['nightlife in berlin', '🌃', 'Nightlife'],
            ['visit an ancient temple', '🏛', 'Culture'],
            ['yoga and onsen', '🧘', 'Wellness'],
            ['honeymoon getaway', '💕', 'Romantic'],
            ['cross the sahara desert', '🏜', 'Desert'],
            ['route 66 road trip', '🚗', 'Road trip'],
            ['mediterranean cruise', '🛳', 'Cruise'],
            ['bungee jump off a bridge', '🪂', 'Adventure'],
        ];
        for (const [text, emoji, tag] of cases) {
            const out = enrichBucketGoal(text);
            expect(out.emoji, text).toBe(emoji);
            expect(out.tags[0], text).toBe(tag);
        }
    });
});
