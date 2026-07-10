/** Wire-shape fixtures for `GET /places/image`. The module's raw response
 *  interface is private, so the shape is pinned locally as `as const`.
 *  `placeImageWireFixture` carries full attribution; `placeImageNoCreditWireFixture`
 *  nulls the photographer fields so the reshaper's nullable passthrough is covered. */
export const placeImageWireFixture = {
    image_url: 'https://images.example.com/paris-hero.jpg',
    photographer_name: 'Ansel Adams',
    photographer_url: 'https://example.com/ansel',
    source: 'unsplash',
} as const;

export const placeImageNoCreditWireFixture = {
    image_url: 'https://images.example.com/kyoto-hero.jpg',
    photographer_name: null,
    photographer_url: null,
    source: 'pexels',
} as const;
