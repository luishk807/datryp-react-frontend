/** Wire-shape fixture for a populated `GET /travel-advisory` 200. The module's
 *  raw response interface is private, so the snake_case shape is pinned locally
 *  as `as const`. */
export const travelAdvisoryResponseFixture = {
    destination_code: 'MX',
    source_code: 'US',
    source_name: 'U.S. Department of State',
    url: 'https://travel.state.gov/mexico',
    level: 2,
    label: 'Exercise Increased Caution',
    updated: '2026-06-01',
} as const;
