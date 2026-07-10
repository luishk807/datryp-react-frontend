/** Wire-shape fixture for `GET /seasonal-best-places`. The raw interfaces are
 *  private, so the shape is pinned locally. Two places (one with full credit,
 *  one with nulls) plus the `cached` flag exercise the `toPlace` reshape. */
export const seasonalBestPlacesWireFixture = {
    month_key: '2026-07',
    places: [
        {
            name: 'Reykjavik',
            country: 'Iceland',
            country_code: 'IS',
            why: 'Midnight sun peaks in July.',
            image_url: 'https://images.example.com/reykjavik.jpg',
            photographer_name: 'Jon Einarsson',
            photographer_url: 'https://example.com/jon',
        },
        {
            name: 'Provence',
            country: 'France',
            country_code: 'FR',
            why: 'Lavender fields bloom mid-summer.',
            image_url: null,
            photographer_name: null,
            photographer_url: null,
        },
    ],
    cached: true,
} as const;
