/** One free-text goal on the current user's bucket list. Mirrors the
 *  backend `BucketListItemResponse`. */
export interface BucketListItem {
    id: string;
    text: string;
    /** AI enrichment (Pro-only). Present when the goal was polished into a
     *  titled card at add time; absent for free-tier rows or when
     *  enrichment was skipped/failed — the UI then falls back to `text`
     *  plus a client-side heuristic. */
    title?: string | null;
    description?: string | null;
    emoji?: string | null;
    tags?: string[];
    /** True once the backend has attempted enrichment on this row (success
     *  or miss). The bucket page uses it to decide whether a Pro one-time
     *  backfill pass is still due. */
    enrichmentAttempted?: boolean;
    createdAt: string;
    updatedAt: string;
}

/** Returned by the backend when a POST is rejected by moderation
 *  (HTTP 422). Wire format matches the FastAPI `detail` payload. */
export interface BucketListBlocked {
    message: string;
    category: string;
}
