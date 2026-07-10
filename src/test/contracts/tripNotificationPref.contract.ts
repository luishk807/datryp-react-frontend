import { z } from 'zod';

/**
 * Zod CONTRACT for the per-trip notification-channel override
 * (GET / PUT /trips/{tripId}/notification-pref). `channel` is one of the four
 * NotifyChannel values or null (no override → account default). The enum is
 * pinned to the exact wire literals so a backend value rename fails the
 * contract. `.strict()` catches extra / renamed fields.
 */
export const TripNotificationPrefContract = z
    .object({
        channel: z.enum(['email', 'sms', 'both', 'none']).nullable(),
    })
    .strict();
