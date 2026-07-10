import type { SavedPlace } from 'types';

/** Snake_case WIRE payload as the backend serves it — fed to MSW so the real
 *  client runs its `toItem` reshaping. */
export const savedPlaceWire = {
    id: 'sp-1',
    place_key: 'eiffel-tower-paris-france',
    place_name: 'Eiffel Tower',
    place_city: 'Paris',
    place_country: 'France',
    country_code: 'FR',
    image_url: 'https://img.example/eiffel.jpg',
    search_query: 'paris landmarks',
    search_index: 2,
    source: 'manual',
    saved_at: '2026-06-01T10:00:00Z',
};

export const savedPlacesResponseWire = {
    items: [savedPlaceWire],
    total: 1,
};

/** The camelCase item the client should produce from `savedPlaceWire`. Typed as
 *  the FE interface so it can't drift from `SavedPlace`. */
export const savedPlaceFixture: SavedPlace = {
    id: 'sp-1',
    placeKey: 'eiffel-tower-paris-france',
    placeName: 'Eiffel Tower',
    placeCity: 'Paris',
    placeCountry: 'France',
    countryCode: 'FR',
    imageUrl: 'https://img.example/eiffel.jpg',
    searchQuery: 'paris landmarks',
    searchIndex: 2,
    source: 'manual',
    savedAt: '2026-06-01T10:00:00Z',
};
