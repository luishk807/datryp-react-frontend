import { z } from 'zod';

/**
 * Zod CONTRACT for `POST /me/trip-complete-ai/{tripId}` success payload —
 * the AI "fill this trip" result. Pins the snake_case wire shape the FE
 * reshapes into `{ itineraryId, addedCount }`.
 *
 * `.strict()` catches backend drift (extra / missing / mistyped field) in CI.
 */
export const CompleteTripWithAiContract = z
    .object({
        itinerary_id: z.string(),
        added_count: z.number(),
    })
    .strict();
