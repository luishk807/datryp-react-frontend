/**
 * RAW wire fixtures for the `/me/bucket-list` endpoints. The snake_case
 * payloads (`enrichment_attempted`, `created_at`, `itinerary_id`, …) are
 * private to the module, so they're pinned inline here; the client reshapes
 * them to camelCase.
 */

/** A Pro-enriched goal: titled card with description, emoji, tags. */
export const bucketListItemRawFixture = {
    id: 'goal-1',
    text: 'See the northern lights',
    title: 'Chase the Aurora in Tromsø',
    description: 'Winter nights above the Arctic Circle for aurora hunting.',
    emoji: '🌌',
    tags: ['nature', 'winter'],
    enrichment_attempted: true,
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-02T10:00:00Z',
} as const;

/** A free-tier goal: enrichment fields absent on the wire. Exercises the
 *  `?? null` / `?? []` / `?? false` coalesce branches in `toItem`. */
export const bucketListItemRawMinimalFixture = {
    id: 'goal-2',
    text: 'Hike the Inca Trail',
    created_at: '2026-06-03T10:00:00Z',
    updated_at: '2026-06-03T10:00:00Z',
} as const;

export const bucketListResponseRawFixture = {
    items: [bucketListItemRawFixture, bucketListItemRawMinimalFixture],
    total: 2,
} as const;

export const bucketListEmptyResponseRawFixture = {
    items: [],
    total: 0,
} as const;

export const bucketTripGenerationRawFixture = {
    itinerary_id: 'trip-77',
    trip_type: 'single',
    trip_name: 'Aurora Week in Tromsø',
    country_name: 'Norway',
    duration_days: 6,
    rationale: 'Built around your aurora goal and Adventurer style.',
} as const;
