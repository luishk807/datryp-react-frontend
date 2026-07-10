import { z } from 'zod';

/**
 * Zod CONTRACT for the trip recap-note endpoint (PUT /me/trip-note/{tripId}).
 * The wire shape is a pass-through of the FE's `TripNote` interface — a single
 * nullable `note`. `.strict()` catches any drift (extra field / rename).
 */
export const TripNoteContract = z
    .object({
        note: z.string().nullable(),
    })
    .strict();
