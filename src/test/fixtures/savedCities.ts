import type { SavedCity } from 'types';

export const savedCityWire = {
    id: 'sc-1',
    city_slug: 'kyoto-jp',
    city_name: 'Kyoto',
    country_name: 'Japan',
    country_code: 'JP',
    image_url: 'https://img.example/kyoto.jpg',
    source: 'manual',
    saved_at: '2026-06-02T09:30:00Z',
};

export const savedCitiesResponseWire = {
    items: [savedCityWire],
    total: 1,
};

export const savedCityFixture: SavedCity = {
    id: 'sc-1',
    citySlug: 'kyoto-jp',
    cityName: 'Kyoto',
    countryName: 'Japan',
    countryCode: 'JP',
    imageUrl: 'https://img.example/kyoto.jpg',
    source: 'manual',
    savedAt: '2026-06-02T09:30:00Z',
};
