/** Wire-shape fixtures for `GET /places/rating`. The raw interfaces are
 *  private, so the shapes are pinned locally. `placeRatingWireFixture` is a
 *  full `all`-fields hit; `placeRatingNoMatchWireFixture` is the `{ result: null }`
 *  no-match envelope the client collapses to null. */
export const placeRatingResultWireFixture = {
    place_id: 'ChIJLU7jZClu5kcR4PcOOO6p3I0',
    name: 'Eiffel Tower',
    rating: 4.7,
    user_rating_count: 289456,
    google_maps_uri: 'https://maps.google.com/?cid=123',
    formatted_address:
        'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
    latitude: 48.8583701,
    longitude: 2.2944813,
    photo_url: 'https://lh3.googleusercontent.com/places/abc',
} as const;

export const placeRatingWireFixture = {
    result: placeRatingResultWireFixture,
} as const;

export const placeRatingNoMatchWireFixture = {
    result: null,
} as const;
