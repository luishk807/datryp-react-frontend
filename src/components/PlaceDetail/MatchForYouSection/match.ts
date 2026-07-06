/**
 * Client-side destination match — pure set math on data already loaded (the
 * user's saved interests × the destination's "Great for" tags), so the
 * "Is this right for you?" widget costs no API call. Consumed by
 * `MatchForYouSection`.
 */

/** User interest slug → the destination "Great for" tags that satisfy it.
 *  Slugs mirror `app/core/interests.py`; tags mirror the backend
 *  `GREAT_FOR_TAGS` vocabulary. An empty list means no tag can satisfy it
 *  (e.g. skiing has no great-for equivalent), so such an interest stays a
 *  "might not satisfy" candidate. */
const INTEREST_TO_TAGS: Record<string, string[]> = {
    foodie: ['foodies'],
    beach: ['beaches'],
    hiking: ['nature', 'adventure'],
    museums: ['culture', 'history'],
    nightlife: ['nightlife'],
    family: ['families'],
    solo: ['solo'],
    budget: ['backpackers'],
    luxury: ['luxury'],
    road_trips: ['nature', 'adventure'],
    wellness: ['nature'],
    photography: ['nature', 'culture'],
    diving: ['beaches'],
    skiing: [],
    festivals: ['culture'],
    local_culture: ['culture', 'history'],
};

/** Interests whose absence is meaningful enough to surface as "might not
 *  satisfy" — geography/vibe-specific needs. Generic interests (foodie,
 *  museums, photography…) are never called out as a miss (too presumptuous —
 *  almost anywhere is fine for them). */
const SPECIFIC_NEEDS = new Set([
    'beach',
    'hiking',
    'skiing',
    'diving',
    'nightlife',
    'luxury',
]);

export interface DestinationMatch {
    /** 60–98, clamped positive-but-honest so no one sees a demoralizing score. */
    score: number;
    /** Interest slugs the destination satisfies — the "Because you like …" row. */
    matched: string[];
    /** Specific-need interest slugs it doesn't meet — "Might not satisfy …". */
    mismatched: string[];
}

const clamp = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, n));

/**
 * Compute a destination match from the user's interests and the destination's
 * "Great for" tags (+ optional cost level for the budget/luxury cross-check).
 * Returns `null` when there's nothing meaningful to show — no known interests,
 * no destination tags, or the interests produced neither a match nor a
 * specific mismatch — so the caller falls back to the plain "Great for" card.
 */
export const computeDestinationMatch = (
    interests: string[],
    greatForTags: string[],
    costLevel?: number
): DestinationMatch | null => {
    const known = interests.filter((slug) => slug in INTEREST_TO_TAGS);
    if (known.length === 0 || greatForTags.length === 0) return null;

    const tagSet = new Set(greatForTags);
    const satisfies = (slug: string): boolean => {
        // Budget / luxury also read the cost level when we have it, since the
        // great-for vocabulary only weakly captures price.
        if (slug === 'budget' && typeof costLevel === 'number') {
            if (costLevel <= 2) return true;
        }
        if (slug === 'luxury' && typeof costLevel === 'number') {
            if (costLevel >= 4) return true;
        }
        return INTEREST_TO_TAGS[slug].some((tag) => tagSet.has(tag));
    };

    const matched: string[] = [];
    const mismatched: string[] = [];
    for (const slug of known) {
        if (satisfies(slug)) matched.push(slug);
        else if (SPECIFIC_NEEDS.has(slug)) mismatched.push(slug);
    }
    if (matched.length === 0 && mismatched.length === 0) return null;

    const raw = matched.length / known.length;
    const score = clamp(Math.round(60 + raw * 38), 60, 98);
    return { score, matched, mismatched };
};
