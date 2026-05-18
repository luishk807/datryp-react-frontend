/**
 * Shared error type for travel-scope moderation hits. Thrown by REST + GraphQL
 * search fetchers when the backend returns a 422 (`{ blocked, category }`) or
 * a GraphQL error with `extensions.code === 'QUERY_BLOCKED'`. UI surfaces this
 * as a soft "this isn't travel-related" message — not a generic error toast.
 */

export class QueryBlockedError extends Error {
    readonly category: string;
    readonly blocked = true as const;

    constructor(category: string) {
        super(`Query blocked: ${category}`);
        this.name = 'QueryBlockedError';
        this.category = category;
    }
}

export const isQueryBlockedError = (err: unknown): err is QueryBlockedError =>
    err instanceof QueryBlockedError;
