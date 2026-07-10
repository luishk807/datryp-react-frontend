/** Wire-shape fixtures for `GET /me/place-suggestions`. The raw interfaces are
 *  private, so the shape is pinned locally. `placeSuggestionsWireFixture` carries
 *  two fully-populated items (coordinates present — the canonical current shape). */
export const placeSuggestionWireFixture = {
    name: 'Lisbon',
    country: 'Portugal',
    country_code: 'PT',
    why: 'Sunny, walkable, and matches your love of coastal food scenes.',
    image_url: 'https://images.example.com/lisbon.jpg',
    photographer_name: 'Maria Silva',
    photographer_url: 'https://example.com/maria',
    latitude: 38.7223,
    longitude: -9.1393,
} as const;

export const placeSuggestionsWireFixture = {
    items: [
        placeSuggestionWireFixture,
        {
            name: 'Oaxaca',
            country: 'Mexico',
            country_code: 'MX',
            why: 'Deep culinary culture and vibrant markets.',
            image_url: null,
            photographer_name: null,
            photographer_url: null,
            latitude: 17.0732,
            longitude: -96.7266,
        },
    ],
} as const;
