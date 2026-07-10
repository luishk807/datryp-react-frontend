import { z } from 'zod';

/**
 * Zod CONTRACT for the per-user trip rating + recap endpoint
 * (GET / PUT /me/trip-rating/{tripId}). Pins the RAW snake_case wire shape the
 * client reshapes to camelCase (`my_rating` → `myRating`, …). Ratings/average
 * are nullable (unset / nobody rated); `count` is always a number.
 * `.strict()` catches drift.
 */
export const TripRatingWireContract = z
    .object({
        my_rating: z.number().nullable(),
        my_expectations: z.string().nullable(),
        my_surprised: z.string().nullable(),
        my_advice: z.string().nullable(),
        average: z.number().nullable(),
        count: z.number(),
    })
    .strict();
