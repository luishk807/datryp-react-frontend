import { z } from 'zod';

/**
 * Zod CONTRACT for a Completed trip's "friends who joined" endpoint
 * (GET /me/trip-companions/{tripId}). Pins the RAW snake_case wire envelope
 * (`{ companions: [...] }`) the client reshapes to a camelCase array.
 * `.strict()` on both the envelope and each companion catches drift.
 */
export const TripCompanionWireContract = z
    .object({
        user_id: z.string(),
        name: z.string().nullable(),
        profile_image_url: z.string().nullable(),
        rating: z.number().nullable(),
        favorite_place: z.string().nullable(),
    })
    .strict();

export const TripCompanionsWireContract = z
    .object({
        companions: z.array(TripCompanionWireContract),
    })
    .strict();
