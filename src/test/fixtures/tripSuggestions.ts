/**
 * RAW wire fixture for the lightbulb trip-suggestions endpoint. The snake_case
 * response (`estimated_cost_usd`, `dont_forget`, `resets_at`, …) is private to
 * the module, so it's pinned inline here; the client reshapes to camelCase.
 * The second suggestion exercises the all-null (no place/category/cost/image)
 * branch.
 */
export const tripSuggestionsRawFixture = {
    suggestions: [
        {
            name: 'teamLab Planets',
            place: 'Toyosu, Tokyo',
            category: 'Museum',
            why: 'Immersive digital-art rooms unlike anything back home.',
            estimated_cost_usd: 32,
            duration_hours: 2,
            image_url: 'https://images.unsplash.com/photo-teamlab',
            photographer_name: 'Jane Doe',
            photographer_url: 'https://unsplash.com/@janedoe',
        },
        {
            name: 'Sunrise at a neighborhood shrine',
            place: null,
            category: null,
            why: 'A quiet, free way to start the day like a local.',
            estimated_cost_usd: null,
            duration_hours: null,
            image_url: null,
            photographer_name: null,
            photographer_url: null,
        },
    ],
    dont_forget: 'Carry cash — many small shops are cash-only.',
    quota: {
        used: 1,
        cap: 5,
        remaining: 4,
        resets_at: '2026-07-11T00:00:00Z',
        window: 'day',
    },
} as const;
