import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /me/world-event` — the Pro "biggest upcoming world
 * event" pick (one event + N host cities). `event` and each `place` reshape
 * snake→camel; image / credit fields are nullable. The endpoint also emits
 * 204 (→ null) which the client short-circuits before parsing, so this
 * contract only pins the populated body. `.strict()` on every level.
 */
export const WorldEventInfoWireContract = z
    .object({
        name: z.string(),
        start_date: z.string(),
        end_date: z.string(),
        host_country: z.string(),
        description: z.string(),
        hype: z.string(),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

export const WorldEventPlaceWireContract = z
    .object({
        name: z.string(),
        country: z.string(),
        country_code: z.string(),
        why: z.string(),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

export const WorldEventWireContract = z
    .object({
        event: WorldEventInfoWireContract,
        places: z.array(WorldEventPlaceWireContract),
    })
    .strict();
