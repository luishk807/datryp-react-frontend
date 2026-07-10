/**
 * RAW wire fixtures for the review endpoints. The snake_case payloads
 * (`is_verified_visit`, `like_count`, `friend_likers`, …) are private to the
 * module, so they're pinned inline here; the client reshapes them to camelCase.
 */

/** A fully-populated, verified public review with tags + a friend liker. */
export const reviewItemRawFixture = {
    id: 'rev-1',
    author: { id: 'user-9', name: 'Mika' },
    rating: 5,
    text: 'The ramen alone was worth the flight.',
    tags: ['great-food', 'worth-it'],
    expectations: 'better',
    visibility: 'public',
    is_verified_visit: true,
    created_at: '2026-07-01T12:00:00Z',
    updated_at: '2026-07-02T09:30:00Z',
    like_count: 4,
    viewer_has_liked: true,
    is_owner: false,
    friend_likers: [{ id: 'user-3', name: 'Ana', email: 'ana@example.com' }],
} as const;

/** Minimal review: `tags` null on the wire (client coalesces to `[]`), no
 *  text/expectations, anonymised visibility, no friend likers. Exercises the
 *  `tags ?? []` coalesce branch in `toItem`. */
export const reviewItemRawMinimalFixture = {
    id: 'rev-2',
    author: { id: 'user-2', name: null },
    rating: 3,
    text: null,
    tags: null,
    expectations: null,
    visibility: 'anon',
    is_verified_visit: false,
    created_at: '2026-06-15T08:00:00Z',
    updated_at: '2026-06-15T08:00:00Z',
    like_count: 0,
    viewer_has_liked: false,
    is_owner: true,
    friend_likers: [],
} as const;

export const reviewsResponseRawFixture = {
    place_key: 'jp-tokyo-ramen-street',
    total: 2,
    average_rating: 4,
    rating_counts: { '5': 1, '3': 1 },
    viewer_review_id: 'rev-2',
    items: [reviewItemRawFixture, reviewItemRawMinimalFixture],
    page: 1,
    page_size: 10,
    total_pages: 1,
    sort: 'recent',
} as const;

/** Empty page: no reviews yet (average null, empty items). */
export const reviewsResponseEmptyRawFixture = {
    place_key: 'jp-tokyo-ramen-street',
    total: 0,
    average_rating: null,
    rating_counts: {},
    viewer_review_id: null,
    items: [],
    page: 1,
    page_size: 10,
    total_pages: 0,
    sort: 'recent',
} as const;

export const reviewInsightsRawFixture = {
    place_key: 'jp-tokyo-ramen-street',
    total: 12,
    verified_count: 9,
    average_rating: 4.4,
    expectations: {
        total: 12,
        better: 7,
        as_expected: 4,
        overhyped: 1,
        lived_up_pct: 92,
    },
    top_tags: [
        { slug: 'great-food', count: 8, pct: 67 },
        { slug: 'worth-it', count: 5, pct: 42 },
    ],
} as const;
