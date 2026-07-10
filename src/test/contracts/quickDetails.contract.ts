import { z } from 'zod';

/**
 * Zod CONTRACT for the progressive prose slices shared by
 *   GET /city-details/quick   and   GET /country-details/quick.
 * The wire is a flat narrative-only bundle; each field is nullable because a
 * cheap first-pass OpenAI call may not have produced every paragraph yet. The
 * client applies `?? null` on each, so an omitted key collapses to null — that
 * legacy/partial case is exercised with a raw `{}` payload in the test rather
 * than relaxing this canonical contract. `.strict()` flags new prose fields.
 */
export const DestinationProseWireContract = z
    .object({
        long_description: z.string().nullable(),
        country_description: z.string().nullable(),
        budget_description: z.string().nullable(),
    })
    .strict();
