import { z } from 'zod';

/**
 * Zod CONTRACT for the auto-export-on-confirm endpoint
 * (POST /trips/{tripId}/export-email). The response is the reach summary of
 * how many members were emailed the itinerary. Wire shape == the FE's
 * `TripExportEmailResult` interface. `.strict()` catches backend drift.
 */
export const TripExportEmailResultContract = z
    .object({
        recipients: z.number(),
        emails: z.number(),
    })
    .strict();
