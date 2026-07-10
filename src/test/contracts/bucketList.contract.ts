import { z } from 'zod';

/**
 * Zod CONTRACTS for the `/me/bucket-list` endpoints. These pin the RAW
 * snake_case wire shapes the client reshapes to camelCase
 * (`enrichment_attempted` → `enrichmentAttempted`, `itinerary_id` →
 * `itineraryId`, …). The enrichment fields (`title`, `description`, `emoji`,
 * `tags`, `enrichment_attempted`) are OPTIONAL on the wire — absent for
 * free-tier rows — so the contract marks them `.optional()` and the client
 * coalesces the misses.
 *
 * `.strict()` catches drift. Update alongside the FE `BucketListItem` interface.
 */

export const BucketListItemWireContract = z
    .object({
        id: z.string(),
        text: z.string(),
        title: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        emoji: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        enrichment_attempted: z.boolean().optional(),
        created_at: z.string(),
        updated_at: z.string(),
    })
    .strict();

export const BucketListResponseWireContract = z
    .object({
        items: z.array(BucketListItemWireContract),
        total: z.number(),
    })
    .strict();

/** trip_type is a closed enum: a single-country trip or a multi-destination
 *  one. */
export const BucketTripGenerationWireContract = z
    .object({
        itinerary_id: z.string(),
        trip_type: z.enum(['single', 'multi']),
        trip_name: z.string(),
        country_name: z.string(),
        duration_days: z.number(),
        rationale: z.string(),
    })
    .strict();

/** 402 paywall detail — surfaced as `BucketListPaywallError`. `cap` /
 *  `current_count` only accompany the `bucket_list_cap` kind. */
export const BucketListPaywallDetailContract = z
    .object({
        kind: z.enum([
            'bucket_list_cap',
            'bucket_list_generate',
            'ai_trip_builder_pro',
        ]),
        message: z.string(),
        cap: z.number().optional(),
        current_count: z.number().optional(),
    })
    .strict();

/** 422 moderation-block detail — surfaced as `BucketListBlockedError`. */
export const BucketListBlockedDetailContract = z
    .object({
        message: z.string(),
        category: z.string(),
    })
    .strict();
