import { z } from 'zod';

/**
 * Zod CONTRACTS for the REST review endpoints (place reviews + insights).
 * These pin the RAW snake_case wire shape the client reshapes to camelCase
 * (`is_verified_visit` → `isVerifiedVisit`, `like_count` → `likeCount`, …).
 *
 * `.strict()` — an unexpected extra field OR a missing field both fail, so a
 * backend response drifting from what the FE expects is caught in CI instead
 * of surfacing as a runtime `undefined`. Update these alongside the FE
 * `ReviewItem` / `ReviewsResponse` / `ReviewInsights` interfaces.
 */

/** Review visibility is a closed enum on the wire: a private draft, an
 *  anonymised public review, or a fully-attributed public review. */
export const REVIEW_VISIBILITY = ['private', 'anon', 'public'] as const;

export const ReviewAuthorContract = z
    .object({
        id: z.string(),
        name: z.string().nullable(),
    })
    .strict();

export const FriendLikerContract = z
    .object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string(),
    })
    .strict();

/** RAW review item as the backend serialises it (snake_case). `tags` may be
 *  null on the wire (the client coalesces it to `[]`). */
export const ReviewItemWireContract = z
    .object({
        id: z.string(),
        author: ReviewAuthorContract,
        rating: z.number(),
        text: z.string().nullable(),
        tags: z.array(z.string()).nullable(),
        expectations: z.string().nullable(),
        visibility: z.enum(REVIEW_VISIBILITY),
        is_verified_visit: z.boolean(),
        created_at: z.string(),
        updated_at: z.string(),
        like_count: z.number(),
        viewer_has_liked: z.boolean(),
        is_owner: z.boolean(),
        friend_likers: z.array(FriendLikerContract),
    })
    .strict();

export const ReviewSortContract = z.enum(['recent', 'highest', 'lowest']);

export const ReviewsResponseWireContract = z
    .object({
        place_key: z.string(),
        total: z.number(),
        average_rating: z.number().nullable(),
        rating_counts: z.record(z.string(), z.number()),
        viewer_review_id: z.string().nullable(),
        items: z.array(ReviewItemWireContract),
        page: z.number(),
        page_size: z.number(),
        total_pages: z.number(),
        sort: ReviewSortContract,
    })
    .strict();

export const ReviewInsightChipContract = z
    .object({
        slug: z.string(),
        count: z.number(),
        pct: z.number(),
    })
    .strict();

export const ReviewExpectationsWireContract = z
    .object({
        total: z.number(),
        better: z.number(),
        as_expected: z.number(),
        overhyped: z.number(),
        lived_up_pct: z.number(),
    })
    .strict();

export const ReviewInsightsWireContract = z
    .object({
        place_key: z.string(),
        total: z.number(),
        verified_count: z.number(),
        average_rating: z.number().nullable(),
        expectations: ReviewExpectationsWireContract,
        top_tags: z.array(ReviewInsightChipContract),
    })
    .strict();
