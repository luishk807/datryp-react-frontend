import { z } from 'zod';

/**
 * Zod CONTRACTS for the AI Trip Builder boundary:
 *   POST /me/plan-trip-ai/options → { options: TripOptionRaw[] }
 *   POST /me/plan-trip-ai         → AiTripBuilderResultRaw
 *
 * Options reshape snake→camel (image / credit fields nullable); the plan result
 * carries a `trip_type` enum ('single' | 'multi'). 402 is handled as a typed
 * paywall error upstream, so these contracts pin only the success bodies.
 * `.strict()` on every level.
 */
export const TripOptionWireContract = z
    .object({
        country_name: z.string(),
        country_code: z.string(),
        headline: z.string(),
        why_this_fits: z.string(),
        estimated_cost_usd: z.number(),
        duration_days: z.number(),
        highlights: z.array(z.string()),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

export const TripOptionsResponseWireContract = z
    .object({
        options: z.array(TripOptionWireContract),
    })
    .strict();

export const AiTripBuilderResultWireContract = z
    .object({
        itinerary_id: z.string(),
        trip_type: z.enum(['single', 'multi']),
        trip_name: z.string(),
        country_name: z.string(),
        duration_days: z.number(),
        rationale: z.string(),
    })
    .strict();
