import { z } from 'zod';

/**
 * Zod CONTRACT for the per-activity notify fan-out
 * (POST /trips/{tripId}/activities/{activityId}/notify). This pins the RAW
 * snake_case wire shape the client reshapes to camelCase (`in_app` → `inApp`),
 * so a rename of `in_app` on the backend is caught here. `.strict()` catches
 * extra / missing fields.
 */
export const NotifyActivityResultWireContract = z
    .object({
        recipients: z.number(),
        in_app: z.number(),
        emails: z.number(),
        sms: z.number(),
    })
    .strict();
