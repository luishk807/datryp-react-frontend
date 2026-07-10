/** Wire fixtures for `GET /flights/lookup`. Raw envelope is private to the
 *  module, so the snake_case shape is pinned inline here. */
export const flightLookupResponseFixture = {
    result: {
        flight_number: 'UA123',
        depart_airport: 'SFO',
        arrival_airport: 'JFK',
        depart_date: '2026-09-01',
        depart_time: '08:30',
        arrival_date: '2026-09-01',
        arrival_time: '17:05',
        airline: 'United Airlines',
    },
} as const;

/** No-match response — client maps this (and any non-OK) to null. */
export const flightLookupNoMatchFixture = { result: null } as const;
