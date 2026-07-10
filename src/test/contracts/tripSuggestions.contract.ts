import { z } from 'zod';

/**
 * Zod CONTRACT for the lightbulb trip-suggestions endpoint
 * (POST /me/trip-suggestions/{tripId}). Pins the RAW snake_case wire shape the
 * client reshapes to camelCase (`estimated_cost_usd` → `estimatedCostUsd`,
 * `dont_forget` → `dontForget`, `resets_at` → `resetsAt`). Cost/duration/image
 * fields are nullable; `resets_at` is null when the quota is unlimited.
 * `.strict()` on every level catches drift.
 */
export const RawSuggestionContract = z
    .object({
        name: z.string(),
        place: z.string().nullable(),
        category: z.string().nullable(),
        why: z.string(),
        estimated_cost_usd: z.number().nullable(),
        duration_hours: z.number().nullable(),
        image_url: z.string().nullable(),
        photographer_name: z.string().nullable(),
        photographer_url: z.string().nullable(),
    })
    .strict();

export const RawQuotaContract = z
    .object({
        used: z.number(),
        cap: z.number(),
        remaining: z.number(),
        resets_at: z.string().nullable(),
        window: z.string(),
    })
    .strict();

export const TripSuggestionsWireContract = z
    .object({
        suggestions: z.array(RawSuggestionContract),
        dont_forget: z.string(),
        quota: RawQuotaContract,
    })
    .strict();
