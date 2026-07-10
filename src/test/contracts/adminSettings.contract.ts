import { z } from 'zod';

/**
 * Zod CONTRACT for the "free everything" admin toggle state
 * (`GET`/`POST /admin/settings/free-everything`). Both verbs return the same
 * `{ active, until }` state shape.
 *
 * `.strict()` catches backend drift (extra / missing / mistyped field) in CI.
 */
export const FreeEverythingStatusContract = z
    .object({
        active: z.boolean(),
        until: z.string().nullable(),
    })
    .strict();
