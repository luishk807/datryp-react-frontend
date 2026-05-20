/** One free-text goal on the current user's bucket list. Mirrors the
 *  backend `BucketListItemResponse`. */
export interface BucketListItem {
    id: string;
    text: string;
    createdAt: string;
    updatedAt: string;
}

/** Returned by the backend when a POST is rejected by moderation
 *  (HTTP 422). Wire format matches the FastAPI `detail` payload. */
export interface BucketListBlocked {
    message: string;
    category: string;
}
