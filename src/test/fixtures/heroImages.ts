/** Wire-shape fixture for `GET /hero-images`. The module's raw response
 *  interface is private, so the snake_case envelope is pinned locally as
 *  `as const`. Two items so the per-item `map` reshaper is exercised. */
export const heroImagesResponseFixture = {
    items: [
        {
            id: 'hero-tokyo',
            city: 'Tokyo',
            image_url: 'https://images.example.com/tokyo.jpg',
            source: 'unsplash',
            photographer_name: 'Ansel Adams',
            photographer_url: 'https://example.com/ansel',
        },
        {
            id: 'hero-paris',
            city: 'Paris',
            image_url: 'https://images.example.com/paris.jpg',
            source: 'unsplash',
            photographer_name: 'Dorothea Lange',
            photographer_url: 'https://example.com/dorothea',
        },
    ],
} as const;

/** Empty envelope — the client maps it to an empty `HeroImage[]`. */
export const heroImagesEmptyFixture = { items: [] } as const;
