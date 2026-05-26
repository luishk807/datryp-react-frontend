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
