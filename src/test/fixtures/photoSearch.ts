/** Wire-shape fixtures for `GET /photo-search` (+ `/gallery`). The module's raw
 *  response interface is private, so the snake_case shape is pinned locally as
 *  `as const`. `photoSearchNoCreditWireFixture` nulls the photographer fields
 *  so the reshaper's nullable passthrough is covered. */
export const photoSearchWireFixture = {
    image_url: 'https://images.example.com/paris-hero.jpg',
    photographer_name: 'Ansel Adams',
    photographer_url: 'https://example.com/ansel',
} as const;

export const photoSearchNoCreditWireFixture = {
    image_url: 'https://images.example.com/kyoto-hero.jpg',
    photographer_name: null,
    photographer_url: null,
} as const;

/** Gallery envelope — the client maps `photos` to a `PhotoSearchResult[]`. */
export const photoGalleryWireFixture = {
    photos: [photoSearchWireFixture, photoSearchNoCreditWireFixture],
} as const;
