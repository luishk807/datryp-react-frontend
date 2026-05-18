/**
 * Thrown by the AI-search fetcher when a free-tier user hits their daily
 * billable-search cap. The route returns 402 with a structured body
 * `{ detail: { quota_exceeded, limit, used, resets_at } }`; this error
 * preserves the payload so the UI can show the right message + an upgrade CTA.
 */

export class SearchQuotaExceededError extends Error {
    readonly limit: number;
    readonly used: number;
    readonly resetsAt: string | null;
    readonly quotaExceeded = true as const;

    constructor({
        limit,
        used,
        resetsAt,
        message,
    }: {
        limit: number;
        used: number;
        resetsAt?: string | null;
        message?: string;
    }) {
        super(message ?? `Daily AI search limit reached (${used}/${limit}).`);
        this.name = 'SearchQuotaExceededError';
        this.limit = limit;
        this.used = used;
        this.resetsAt = resetsAt ?? null;
    }
}

export const isSearchQuotaExceededError = (
    err: unknown
): err is SearchQuotaExceededError => err instanceof SearchQuotaExceededError;
