/** Wire-shape fixture for `GET /me/monthly-best-place`. The raw interfaces are
 *  private, so the shape is pinned locally. Exercises the nested `place` reshape
 *  plus the flat `highlights` passthrough. */
export const monthlyBestPlaceWireFixture = {
    month_key: '2026-07',
    place: {
        name: 'Reykjavik',
        country: 'Iceland',
        country_code: 'IS',
        tagline: 'Midnight sun and geothermal calm.',
        why_for_you:
            'Long July daylight suits your hiking streak and photography interest.',
        image_url: 'https://images.example.com/reykjavik.jpg',
        photographer_name: 'Jon Einarsson',
        photographer_url: 'https://example.com/jon',
    },
    highlights: [
        {
            title: 'Midnight sun hikes',
            description: 'Trek Landmannalaugar under near-24h daylight.',
        },
        {
            title: 'Blue Lagoon',
            description: 'Soak in mineral-rich geothermal waters.',
        },
    ],
} as const;
