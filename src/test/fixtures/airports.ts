/** Wire fixtures for `GET /airports/search`. The raw row shape is private to
 *  the module (it exports only the camelCase `AirportOption`), so the snake_case
 *  wire is pinned inline here. */
export const airportsResponseFixture = {
    items: [
        {
            iata_code: 'SFO',
            name: 'San Francisco International',
            city: 'San Francisco',
            country_code: 'US',
            country: 'United States',
        },
        {
            iata_code: 'JFK',
            name: 'John F. Kennedy International',
            city: 'New York',
            country_code: 'US',
            country: 'United States',
        },
    ],
} as const;

/** No-match response — an empty catalog slice. */
export const airportsEmptyFixture = { items: [] } as const;
