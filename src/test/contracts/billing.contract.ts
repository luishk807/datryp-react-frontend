import { z } from 'zod';

/**
 * Zod CONTRACT for the Stripe billing session endpoints
 * (`POST /billing/checkout-session` + `POST /billing/portal-session`). Both
 * return the same minimal shape: a single hosted `url` the frontend redirects
 * the browser to. `.strict()` catches a renamed key or an added field the
 * client silently drops.
 */
export const BillingSessionResponseContract = z
    .object({
        url: z.string(),
    })
    .strict();
