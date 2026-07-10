/** Wire-shape fixtures for the AI Trip Builder endpoints. The raw interfaces
 *  are private, so the shapes are pinned locally. `tripOptionsResponseWireFixture`
 *  exercises the `toOption` reshape (one card with credits, one without);
 *  `aiTripBuilderResultWireFixture` exercises the plan-result reshape. */
export const tripOptionsResponseWireFixture = {
    options: [
        {
            country_name: 'Portugal',
            country_code: 'PT',
            headline: 'Sun-soaked coast + soulful cities',
            why_this_fits: 'Great food scene and walkable towns on your budget.',
            estimated_cost_usd: 1800,
            duration_days: 7,
            highlights: ['Lisbon miradouros', 'Douro Valley wine', 'Algarve beaches'],
            image_url: 'https://images.example.com/portugal.jpg',
            photographer_name: 'Rui Costa',
            photographer_url: 'https://example.com/rui',
        },
        {
            country_name: 'Vietnam',
            country_code: 'VN',
            headline: 'Street food and limestone bays',
            why_this_fits: 'Incredible value and rich culinary culture.',
            estimated_cost_usd: 1500,
            duration_days: 10,
            highlights: ['Hanoi Old Quarter', 'Ha Long Bay'],
            image_url: null,
            photographer_name: null,
            photographer_url: null,
        },
    ],
} as const;

export const aiTripBuilderResultWireFixture = {
    itinerary_id: 'itin-42',
    trip_type: 'single',
    trip_name: '7 Days in Portugal',
    country_name: 'Portugal',
    duration_days: 7,
    rationale: 'Balances your food + coast interests within budget.',
} as const;
