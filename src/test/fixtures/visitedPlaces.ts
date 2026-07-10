import type { VisitedPlace } from 'types';

/** Snake_case WIRE item WITH a nested `trips` array (exercises the `trips.map`
 *  reshape). */
export const visitedPlaceWire = {
    id: 'vp-1',
    place_key: 'colosseum-rome-italy',
    place_name: 'Colosseum',
    place_city: 'Rome',
    place_country: 'Italy',
    country_code: 'IT',
    region_code: 'IT-62',
    region_name: 'Lazio',
    latitude: 41.8902,
    longitude: 12.4922,
    source: 'itinerary',
    trips: [
        {
            trip_id: 'trip-1',
            trip_name: 'Italy 2026',
            visited_at: '2026-05-10T12:00:00Z',
        },
    ],
    visited_at: '2026-05-10T12:00:00Z',
};

/** A LEGACY wire item with no `trips` key — exercises the `r.trips ?? []`
 *  fallback so the client still yields an array. */
export const visitedPlaceWireNoTrips = {
    id: 'vp-2',
    place_key: 'sensoji-tokyo-japan',
    place_name: 'Sensoji',
    place_city: 'Tokyo',
    place_country: 'Japan',
    country_code: null,
    region_code: null,
    region_name: null,
    latitude: null,
    longitude: null,
    source: 'manual',
    visited_at: '2026-04-01T00:00:00Z',
};

export const visitedPlacesResponseWire = {
    items: [visitedPlaceWire, visitedPlaceWireNoTrips],
    total: 2,
};

/** Expected camelCase reshape of `visitedPlaceWire`. Typed as the FE interface. */
export const visitedPlaceFixture: VisitedPlace = {
    id: 'vp-1',
    placeKey: 'colosseum-rome-italy',
    placeName: 'Colosseum',
    placeCity: 'Rome',
    placeCountry: 'Italy',
    countryCode: 'IT',
    regionCode: 'IT-62',
    regionName: 'Lazio',
    latitude: 41.8902,
    longitude: 12.4922,
    source: 'itinerary',
    trips: [
        {
            tripId: 'trip-1',
            tripName: 'Italy 2026',
            visitedAt: '2026-05-10T12:00:00Z',
        },
    ],
    visitedAt: '2026-05-10T12:00:00Z',
};
