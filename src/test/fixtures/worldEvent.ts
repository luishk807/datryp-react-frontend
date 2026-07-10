/** Wire-shape fixture for `GET /me/world-event`. The raw interfaces are
 *  private, so the shape is pinned locally. Exercises the nested `event` +
 *  `places` snake→camel reshape. */
export const worldEventWireFixture = {
    event: {
        name: 'FIFA World Cup 2026',
        start_date: '2026-06-11',
        end_date: '2026-07-19',
        host_country: 'United States',
        description: 'The biggest football tournament on Earth.',
        hype: 'A once-in-a-lifetime summer of football across North America.',
        image_url: 'https://images.example.com/wc.jpg',
        photographer_name: 'Sam Field',
        photographer_url: 'https://example.com/sam',
    },
    places: [
        {
            name: 'New York',
            country: 'United States',
            country_code: 'US',
            why: 'Hosts the final at MetLife Stadium.',
            image_url: 'https://images.example.com/ny.jpg',
            photographer_name: 'Dana West',
            photographer_url: 'https://example.com/dana',
        },
    ],
} as const;
