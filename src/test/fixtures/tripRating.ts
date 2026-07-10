/**
 * RAW wire fixtures for the trip-rating endpoint. The snake_case payload
 * (`my_rating`, `my_expectations`, …) is private to the module, so it's pinned
 * inline here; the client reshapes it to camelCase.
 */
export const tripRatingPayloadFixture = {
    my_rating: 5,
    my_expectations: 'Hoped for great ramen — it delivered.',
    my_surprised: 'The train punctuality blew me away.',
    my_advice: 'Get a Suica card on day one.',
    average: 4.5,
    count: 3,
} as const;

/** Nobody (including the viewer) has rated yet — all rating fields null. */
export const tripRatingEmptyPayloadFixture = {
    my_rating: null,
    my_expectations: null,
    my_surprised: null,
    my_advice: null,
    average: null,
    count: 0,
} as const;
