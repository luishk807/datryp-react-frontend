import type { VisitedCity } from 'types';

/** Wire item WITH coordinates. */
export const visitedCityWire = {
    id: 'vc-1',
    city_slug: 'rome-it',
    city_name: 'Rome',
    country_name: 'Italy',
    country_code: 'IT',
    latitude: 41.9028,
    longitude: 12.4964,
    source: 'itinerary',
    visited_at: '2026-05-11T00:00:00Z',
};

/** Wire item with NULL coordinates — exercises the `?? null` fallbacks. */
export const visitedCityWireNoCoords = {
    id: 'vc-2',
    city_slug: 'osaka-jp',
    city_name: 'Osaka',
    country_name: 'Japan',
    country_code: 'JP',
    latitude: null,
    longitude: null,
    source: 'manual',
    visited_at: '2026-04-02T00:00:00Z',
};

export const visitedCitiesResponseWire = {
    items: [visitedCityWire, visitedCityWireNoCoords],
    total: 2,
};

export const visitedCityFixture: VisitedCity = {
    id: 'vc-1',
    citySlug: 'rome-it',
    cityName: 'Rome',
    countryName: 'Italy',
    countryCode: 'IT',
    latitude: 41.9028,
    longitude: 12.4964,
    source: 'itinerary',
    visitedAt: '2026-05-11T00:00:00Z',
};
