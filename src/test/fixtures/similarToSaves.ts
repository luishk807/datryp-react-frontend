/** Wire-shape fixtures for `GET /me/similar-to-saves`. The raw snake_case type
 *  isn't exported from the module (the client returns only the reshaped
 *  camelCase result), so we pin the wire shape locally here. */
export interface SimilarPlaceItemWire {
    place_key: string;
    name: string;
    city: string;
    country: string;
    country_code: string | null;
    image_url: string | null;
    best_time_to_visit: string | null;
    similarity: number;
}

export interface SimilarToSavesWire {
    items: SimilarPlaceItemWire[];
}

export const similarItemFixture: SimilarPlaceItemWire = {
    place_key: 'kyoto-jp',
    name: 'Kyoto',
    city: 'Kyoto',
    country: 'Japan',
    country_code: 'JP',
    image_url: 'https://img.example/kyoto.jpg',
    best_time_to_visit: 'March to May',
    similarity: 0.87,
};

export const similarToSavesFixture: SimilarToSavesWire = {
    items: [
        similarItemFixture,
        {
            place_key: 'bali-id',
            name: 'Bali',
            city: 'Denpasar',
            country: 'Indonesia',
            country_code: null,
            image_url: null,
            best_time_to_visit: null,
            similarity: 0.72,
        },
    ],
};

export const similarToSavesEmptyFixture: SimilarToSavesWire = { items: [] };
