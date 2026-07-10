/**
 * RAW wire fixture for the trip-companions endpoint. The snake_case envelope
 * (`{ companions: [{ user_id, profile_image_url, favorite_place }] }`) is
 * private to the module, so it's pinned inline here; the client reshapes each
 * companion to camelCase. Second entry exercises the all-null (no rating / no
 * review / no photo) branch.
 */
export const tripCompanionsPayloadFixture = {
    companions: [
        {
            user_id: 'user-1',
            name: 'Alice',
            profile_image_url: 'https://cdn.example.com/alice.jpg',
            rating: 5,
            favorite_place: 'Fushimi Inari',
        },
        {
            user_id: 'user-2',
            name: null,
            profile_image_url: null,
            rating: null,
            favorite_place: null,
        },
    ],
} as const;

/** No other members reviewed / joined — an empty companions list. */
export const tripCompanionsEmptyFixture = {
    companions: [],
} as const;
