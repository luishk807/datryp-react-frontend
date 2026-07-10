import { z } from 'zod';

/**
 * Zod CONTRACT for a 200 `GET /travel-advisory` hit (app backend
 * `TravelAdvisoryRaw`). This contract only describes the JSON body of a
 * populated snapshot — a 204 / error never reaches it because the client maps
 * those to null first. The client reshapes snake→camel into `TravelAdvisory`.
 * `level` is the numeric 1-4 band; the rest are strings. `.strict()` catches a
 * renamed key or an added field the reshaper doesn't map.
 */
export const TravelAdvisoryWireContract = z
    .object({
        destination_code: z.string(),
        source_code: z.string(),
        source_name: z.string(),
        url: z.string(),
        level: z.number(),
        label: z.string(),
        updated: z.string(),
    })
    .strict();
