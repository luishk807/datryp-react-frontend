/**
 * REST wrapper for `GET /me/search-history` on the Python backend.
 *
 * Server-side paginated by `offset + limit`. The header dropdown calls
 * with just a small `limit` (no offset); the /history page passes an
 * explicit offset per page. Response carries `total` so the client can
 * render "Page X of Y" without a separate count call.
 *
 * 401 when unauthenticated — the hook guards against calling it in
 * that case.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface SearchHistoryItem {
    /** Verbatim search query the user ran. */
    query: string;
    /** ISO timestamp of the most-recent run for this query. */
    lastSearchedAt: string;
}

export interface SearchHistoryPage {
    items: SearchHistoryItem[];
    /** Total distinct queries across all time for the current user. */
    total: number;
}

interface SearchHistoryItemRaw {
    query: string;
    last_searched_at: string;
}

interface SearchHistoryResponseRaw {
    items: SearchHistoryItemRaw[];
    total?: number;
}

export interface FetchSearchHistoryParams {
    limit?: number;
    offset?: number;
}

export const fetchSearchHistory = async (
    params: FetchSearchHistoryParams = {}
): Promise<SearchHistoryPage> => {
    const { limit = 10, offset = 0 } = params;
    const token = getAuthToken();
    if (!token) {
        // Caller should gate on auth state before invoking; defensive empty.
        return { items: [], total: 0 };
    }
    const qs = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
    });
    const resp = await fetch(`${API_BASE}/me/search-history?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
        throw new Error(
            `/me/search-history failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as SearchHistoryResponseRaw;
    const items = body.items.map((it) => ({
        query: it.query,
        lastSearchedAt: it.last_searched_at,
    }));
    // `total === 0` means the backend didn't tell us — older versions
    // of this route didn't include the field. The page-level code uses
    // the items-count == limit heuristic to enable Next anyway.
    return { items, total: body.total ?? 0 };
};
