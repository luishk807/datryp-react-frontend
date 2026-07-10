/** Wire-shape fixtures for the "nearest departure" endpoints. The raw
 *  interfaces are private, so the envelope shapes are pinned locally.
 *  Exercises the `toAirport` / `toStation` snake→camel reshape. */
export const nearestAirportEnvelopeFixture = {
    airport: {
        iata_code: 'PTY',
        name: 'Tocumen International Airport',
        city: 'Panama City',
        country: 'Panama',
        country_code: 'PA',
        latitude: 9.0714,
        longitude: -79.3835,
        distance_km: 24.6,
    },
} as const;

export const nearestStationEnvelopeFixture = {
    station: {
        code: 'PACIF',
        name: 'Panama Canal Railway Station',
        city: 'Panama City',
        country: 'Panama',
        country_code: 'PA',
        latitude: 8.9536,
        longitude: -79.5637,
        distance_km: 5.1,
    },
} as const;
