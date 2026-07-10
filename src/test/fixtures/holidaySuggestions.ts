/** Wire-shape fixture for `GET /me/holiday-suggestions`. The raw interfaces are
 *  private, so the shape is pinned locally. Exercises the nested `holiday` +
 *  `places` reshape and the flat `activities` passthrough. */
export const holidaySuggestionsWireFixture = {
    holiday: {
        name: 'Día de los Muertos',
        date: '2026-11-02',
        country: 'Mexico',
        description: 'A vibrant celebration honoring departed loved ones.',
        image_url: 'https://images.example.com/muertos.jpg',
        photographer_name: 'Ana López',
        photographer_url: 'https://example.com/ana',
    },
    places: [
        {
            name: 'Oaxaca',
            country: 'Mexico',
            country_code: 'MX',
            why: 'The most atmospheric Día de los Muertos celebrations.',
            image_url: 'https://images.example.com/oaxaca.jpg',
            photographer_name: 'Luis Cruz',
            photographer_url: 'https://example.com/luis',
        },
    ],
    activities: [
        {
            title: 'Visit a panteón at night',
            description: 'Candlelit graveyard vigils honoring the departed.',
        },
    ],
} as const;
