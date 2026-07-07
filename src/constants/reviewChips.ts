/**
 * Type-aware review chip taxonomy — the structured half of an activity review.
 *
 * A chip is stored as its SLUG (e.g. `worth_the_money`); the emoji here + the
 * i18n key `review.chips.<slug>` are presentation only. The same slugs power
 * the detail-page "Verified traveler insights" aggregation, so FE + BE must
 * agree on them (see the backend spec in project memory).
 *
 * Which set an activity shows is decided by `placeCategoryFor(name)` in
 * `utils/placeCategory` — there is no stored activity category, so the place
 * name is classified the same way the timeline icon is (`placeIconFor`).
 */

export const REVIEW_CATEGORY = {
    ATTRACTION: 'attraction',
    RESTAURANT: 'restaurant',
    BEACH: 'beach',
    MUSEUM: 'museum',
    HIKE: 'hike',
    UNIVERSAL: 'universal',
} as const;

/** Chip slugs offered per place category (max 5 — keeps the inline UI short). */
export const REVIEW_CHIPS: Record<string, readonly string[]> = {
    [REVIEW_CATEGORY.ATTRACTION]: [
        'better_than_photos',
        'crowded',
        'worth_the_money',
        'hidden_gem',
        'long_lines',
    ],
    [REVIEW_CATEGORY.RESTAURANT]: [
        'delicious',
        'worth_the_price',
        'great_service',
        'long_wait',
        'tourist_trap',
    ],
    [REVIEW_CATEGORY.BEACH]: [
        'crystal_clear_water',
        'crowded',
        'great_for_families',
        'easy_parking',
        'hidden_gem',
    ],
    [REVIEW_CATEGORY.MUSEUM]: [
        'worth_the_ticket',
        'educational',
        'crowded',
        'needs_more_time',
        'skip_the_tour',
    ],
    [REVIEW_CATEGORY.HIKE]: [
        'amazing_views',
        'challenging',
        'worth_the_effort',
        'bring_water',
        'family_friendly',
    ],
    // `better_than_expected` is intentionally NOT here — it duplicates the
    // expectations row's "Better", so the tag set uses `better_than_photos`.
    [REVIEW_CATEGORY.UNIVERSAL]: [
        'worth_the_money',
        'better_than_photos',
        'crowded',
        'hidden_gem',
        'would_visit_again',
        'great_for_families',
    ],
} as const;

/** How many chips a reviewer may pick — keeps a review scannable. */
export const REVIEW_MAX_TAGS = 3;

/** Emoji shown beside each chip label (in the picker + the insights widget). */
export const REVIEW_CHIP_EMOJI: Record<string, string> = {
    better_than_photos: '📸',
    crowded: '🔥',
    worth_the_money: '💰',
    hidden_gem: '💎',
    long_lines: '⏳',
    delicious: '🍜',
    worth_the_price: '💰',
    great_service: '😊',
    long_wait: '⏳',
    tourist_trap: '⚠️',
    crystal_clear_water: '🌊',
    great_for_families: '👨‍👩‍👧',
    easy_parking: '🅿️',
    worth_the_ticket: '🎟️',
    educational: '🎓',
    needs_more_time: '⏱️',
    skip_the_tour: '🚫',
    amazing_views: '🌄',
    challenging: '🥾',
    worth_the_effort: '💪',
    bring_water: '💧',
    family_friendly: '👨‍👩‍👧',
    better_than_expected: '👍',
    would_visit_again: '🔁',
};

/** Who may see a review. Drives the aggregate contribution + name display. */
export const REVIEW_VISIBILITY = {
    PRIVATE: 'private',
    ANONYMOUS: 'anonymous',
    PUBLIC: 'public',
} as const;

/** Per-activity "did it live up to expectations" sentiment (widget %). */
export const ACTIVITY_EXPECTATION = {
    BETTER: 'better',
    AS_EXPECTED: 'as_expected',
    OVERHYPED: 'overhyped',
} as const;

/** Trip-recap expectations — a distinct vocabulary from the activity one. */
export const TRIP_EXPECTATION = {
    BETTER: 'better',
    ABOUT: 'about',
    WORSE: 'worse',
} as const;

/** Emoji for the three-way expectations rows (shared by the activity review,
 *  the trip recap, and the place-page insights widget). */
export const EXPECTATION_EMOJI = {
    positive: '😊',
    neutral: '😐',
    negative: '🙁',
} as const;
