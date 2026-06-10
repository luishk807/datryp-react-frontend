/**
 * `/me/friends-visited/{kind}/{key}` — detail-page "X friends visited
 * here" badge data. Three endpoints (place / city / country) returning
 * the same shape so the FE component can render any of them through
 * one code path.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export type FriendsVisitedKind = 'place' | 'city' | 'country';

export interface FriendVisitedItem {
    userId: string;
    name: string;
    profileImageUrl: string | null;
    /** ISO-8601. Caller decides how to format on the modal. */
    visitedAt: string;
    /** The friend's own star rating (1–5) for this place, if they
     *  reviewed it. Always null for city / country kinds — reviews are
     *  place-keyed only. */
    rating: number | null;
    /** The friend's review body, if any. May be null even when `rating`
     *  is set (rating-only review). */
    reviewText: string | null;
}

export interface FriendsVisitedResult {
    count: number;
    friends: FriendVisitedItem[];
}

interface FriendVisitedItemRaw {
    user_id: string;
    name: string;
    profile_image_url: string | null;
    visited_at: string;
    rating: number | null;
    review_text: string | null;
}

interface FriendsVisitedRaw {
    count: number;
    friends: FriendVisitedItemRaw[];
}

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const toItem = (r: FriendVisitedItemRaw): FriendVisitedItem => ({
    userId: r.user_id,
    name: r.name,
    profileImageUrl: r.profile_image_url,
    visitedAt: r.visited_at,
    // Tolerate older backends that don't yet send review fields — both
    // default to null so the drawer simply omits the stars + quote.
    rating: r.rating ?? null,
    reviewText: r.review_text ?? null,
});

export const fetchFriendsVisited = async (
    kind: FriendsVisitedKind,
    key: string,
): Promise<FriendsVisitedResult> => {
    const resp = await fetch(
        `${API_BASE}/me/friends-visited/${kind}/${encodeURIComponent(key)}`,
        { headers: authHeaders() },
    );
    if (!resp.ok) {
        let detail: string | undefined;
        try {
            const body = await resp.json();
            if (typeof body?.detail === 'string') detail = body.detail;
        } catch {
            /* ignore */
        }
        throw new Error(
            `/me/friends-visited/${kind} ${resp.status}${
                detail ? ` — ${detail}` : ''
            }`,
        );
    }
    const body = (await resp.json()) as FriendsVisitedRaw;
    return {
        count: body.count,
        friends: body.friends.map(toItem),
    };
};
