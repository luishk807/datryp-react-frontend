/** Wire fixtures for `GET /transit/lookup`. Raw envelope is private to the
 *  module, so the snake_case shape is pinned inline here. */
export const transitLookupResponseFixture = {
    result: {
        operator: 'Amtrak',
        number: '2151',
        depart_station: 'New York Penn',
        arrival_station: 'Washington Union',
        depart_time: '09:05',
        arrival_time: '12:35',
        depart_date: '2026-09-01',
        arrival_date: '2026-09-01',
        route_name: 'Acela',
    },
} as const;

/** No-match response — client maps this (and any non-OK) to null. */
export const transitLookupNoMatchFixture = { result: null } as const;
