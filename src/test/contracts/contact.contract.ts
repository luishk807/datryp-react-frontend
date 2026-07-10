import { z } from 'zod';

/**
 * Zod CONTRACT for `POST /contact` (app/routers/contact.py). The success body
 * is intentionally tiny — just whether SendGrid accepted the relay.
 *
 * `.strict()` catches backend drift at the wire boundary.
 */
export const ContactFormResponseContract = z
    .object({
        sent: z.boolean(),
    })
    .strict();
