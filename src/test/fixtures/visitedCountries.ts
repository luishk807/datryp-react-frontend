import type { VisitedCountry } from 'types';

export const visitedCountryWire = {
    id: 'vco-1',
    country_id: 'country-uuid-1',
    country_name: 'Italy',
    country_code: 'IT',
    country_image: 'https://img.example/italy.jpg',
    source: 'itinerary',
    visited_at: '2026-05-12T00:00:00Z',
};

export const visitedCountriesResponseWire = {
    items: [visitedCountryWire],
    total: 1,
};

export const visitedCountryFixture: VisitedCountry = {
    id: 'vco-1',
    countryId: 'country-uuid-1',
    countryName: 'Italy',
    countryCode: 'IT',
    countryImage: 'https://img.example/italy.jpg',
    source: 'itinerary',
    visitedAt: '2026-05-12T00:00:00Z',
};
