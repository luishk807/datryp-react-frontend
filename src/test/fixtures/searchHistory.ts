/** Wire fixtures for `GET /me/search-history`. Raw item shape is private to
 *  the module (it exports only the camelCase `SearchHistoryItem`), so the
 *  snake_case wire is pinned inline here. */
export const searchHistoryResponseFixture = {
    items: [
        { query: 'Bali', last_searched_at: '2026-07-08T12:00:00Z' },
        { query: 'Tokyo', last_searched_at: '2026-07-07T09:30:00Z' },
    ],
    total: 2,
} as const;

/** Older-route response that omits `total` — client defaults it to 0. */
export const searchHistoryNoTotalFixture = {
    items: [{ query: 'Rome', last_searched_at: '2026-07-06T08:00:00Z' }],
} as const;
