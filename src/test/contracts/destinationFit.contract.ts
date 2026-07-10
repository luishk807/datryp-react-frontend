import { z } from 'zod';

/**
 * Zod CONTRACT for `GET /me/destination-fit` — the Pro "personal take". On a
 * 200 the body is a minimal `{ opinion?: string }`; the client trims it and
 * collapses empty/missing to null. A 204 / 402 / error never reaches this
 * contract (all map to null before parse). `opinion` is `.optional()` because
 * the generator can legitimately answer with an empty body. `.strict()` guards
 * against a silently-added field the reshaper would ignore.
 */
export const DestinationFitWireContract = z
    .object({
        opinion: z.string().optional(),
    })
    .strict();
