import type { SavedCountry } from 'types';

export const savedCountryWire = {
    id: 'sco-1',
    country_id: 'country-uuid-1',
    country_name: 'Japan',
    country_code: 'JP',
    country_image: 'https://img.example/japan.jpg',
    source: 'manual',
    saved_at: '2026-06-03T08:15:00Z',
};

export const savedCountriesResponseWire = {
    items: [savedCountryWire],
    total: 1,
};

export const savedCountryFixture: SavedCountry = {
    id: 'sco-1',
    countryId: 'country-uuid-1',
    countryName: 'Japan',
    countryCode: 'JP',
    countryImage: 'https://img.example/japan.jpg',
    source: 'manual',
    savedAt: '2026-06-03T08:15:00Z',
};
