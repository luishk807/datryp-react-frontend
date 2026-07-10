import { z } from 'zod';

/**
 * Zod CONTRACT for the maintenance-mode state (`GET /maintenance` public read
 * + `POST /admin/settings/maintenance` write). Both return the same
 * `{ active, mode, message, until }` shape; `mode` is the backend
 * `_MAINTENANCE_MODES` literal set.
 *
 * `.strict()` catches backend drift (extra / missing / mistyped field) in CI.
 */
export const MaintenanceStatusContract = z
    .object({
        active: z.boolean(),
        mode: z.enum(['banner', 'full']),
        message: z.string().nullable(),
        until: z.string().nullable(),
    })
    .strict();
