/** Wire-shape fixture for `GET /top-cities-monthly`. The module's raw response
 *  interface is private, so the snake_case envelope is pinned locally as
 *  `as const`. The second city nulls the image + credit fields so the
 *  reshaper's nullable passthrough is covered. */
export const monthlyTopCitiesResponseFixture = {
    month: '2026-07',
    cached: true,
    cities: [
        {
            name: 'Tokyo',
            country: 'Japan',
            country_code: 'JP',
            why: 'Summer festivals light up the city.',
            image_url: 'https://images.example.com/tokyo.jpg',
            photographer_name: 'Ansel Adams',
            photographer_url: 'https://example.com/ansel',
        },
        {
            name: 'Reykjavik',
            country: 'Iceland',
            country_code: 'IS',
            why: 'Midnight sun and puffin season.',
            image_url: null,
            photographer_name: null,
            photographer_url: null,
        },
    ],
} as const;

/** Fresh (non-cached) response with no cities — client maps to an empty list. */
export const monthlyTopCitiesEmptyFixture = {
    month: '2026-07',
    cached: false,
    cities: [],
} as const;
