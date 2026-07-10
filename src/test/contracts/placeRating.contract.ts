import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /places/rating` — the Google Places (New) proxy.
 * The endpoint always answers 200 with an envelope `{ result: … | null }`;
 * `result` is null on a no-match. Every field inside `result` is nullable
 * because the requested field-mask (`rating` / `place` / `all`) controls which
 * ones Google actually returns. `.strict()` catches new Google fields the
 * `toRating` reshaper hasn't picked up yet.
 */
export const PlaceRatingResultContract = z
    .object({
        place_id: z.string().nullable(),
        name: z.string().nullable(),
        rating: z.number().nullable(),
        user_rating_count: z.number().nullable(),
        google_maps_uri: z.string().nullable(),
        formatted_address: z.string().nullable(),
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
        photo_url: z.string().nullable(),
    })
    .strict();

export const PlaceRatingWireContract = z
    .object({
        result: PlaceRatingResultContract.nullable(),
    })
    .strict();
