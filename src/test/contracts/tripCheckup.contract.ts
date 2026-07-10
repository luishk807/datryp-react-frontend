import { z } from 'zod';

/**
 * Zod CONTRACT for `POST /me/trip-checkup/{tripId}` — readiness score + verdict
 * + per-dimension breakdown for a Planning trip. Three assessment dimensions
 * reshape via `toDimension`; `quota.resets_at` → `resetsAt`. `verdict` is a
 * soft enum kept as a plain string on the wire so labels can be tuned without a
 * schema bump. `.strict()` on every level.
 */
export const TripCheckupDimensionWireContract = z
    .object({
        verdict: z.string(),
        why: z.string(),
        score: z.number(),
    })
    .strict();

export const TripCheckupQuotaWireContract = z
    .object({
        used: z.number(),
        cap: z.number(),
        remaining: z.number(),
        resets_at: z.string().nullable(),
        window: z.string(),
    })
    .strict();

export const TripCheckupWireContract = z
    .object({
        score: z.number(),
        verdict: z.string(),
        summary: z.string(),
        strengths: z.array(z.string()),
        gaps: z.array(z.string()),
        budget_assessment: TripCheckupDimensionWireContract,
        time_assessment: TripCheckupDimensionWireContract,
        activity_assessment: TripCheckupDimensionWireContract,
        quota: TripCheckupQuotaWireContract,
    })
    .strict();
