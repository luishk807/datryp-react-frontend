import { z } from 'zod';

/**
 * Zod CONTRACT for `POST /share/email` (app backend `ShareEmailResponse`).
 * `sent` is always present; `recipients` is optional (older backends / the
 * fan-out count the "Sent to N recipients" copy reads). `.strict()` catches a
 * renamed field or an unexpected extra the client silently drops.
 */
export const ShareEmailResponseContract = z
    .object({
        sent: z.boolean(),
        recipients: z.number().optional(),
    })
    .strict();
