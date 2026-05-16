/**
 * REST wrapper for `GET /me/search-history` on the Python backend.
 * Returns the current user's 10 most-recent (deduped) searches, newest first.
 * 401 when unauthenticated — the hook guards against calling it in that case.
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

interface SearchHistoryItemRaw {
    query: string;
    last_searched_at: string;
}

interface SearchHistoryResponseRaw {
    items: SearchHistoryItemRaw[];
}

export const fetchSearchHistory = async (limit = 10): Promise<SearchHistoryItem[]> => {
    const token = getAuthToken();
    if (!token) {
        // Caller should gate on auth state before invoking; defensive empty.
        return [];
    }
    const params = new URLSearchParams({ limit: String(limit) });
    const resp = await fetch(`${API_BASE}/me/search-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
        throw new Error(`/me/search-history failed: ${resp.status} ${resp.statusText}`);
    }
    const body = (await resp.json()) as SearchHistoryResponseRaw;
    return body.items.map((it) => ({
        query: it.query,
        lastSearchedAt: it.last_searched_at,
    }));
};
