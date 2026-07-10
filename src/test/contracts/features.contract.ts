import { z } from 'zod';

/**
 * Zod CONTRACTS for the feature-flag endpoints (app/routers/features.py +
 * admin SMS settings). `/features` is the public, anonymous-safe read; the
 * admin SMS setting splits the effective flag into its two causes.
 *
 * `.strict()` catches backend drift (extra/missing field) at the wire boundary.
 */
export const FeatureFlagsWireContract = z
    .object({
        sms_enabled: z.boolean(),
    })
    .strict();

export const SmsSettingWireContract = z
    .object({
        enabled: z.boolean(),
        configured: z.boolean(),
        effective: z.boolean(),
    })
    .strict();
