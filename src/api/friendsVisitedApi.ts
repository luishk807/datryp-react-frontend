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

// ── Aggregate: every opted-in friend's visits, for the Atlas overlay ──

export interface FriendBrief {
    userId: string;
    name: string;
    profileImageUrl: string | null;
}

export interface FriendsVisitedCountryGroup {
    countryCode: string;
    countryName: string;
    friends: FriendBrief[];
}

export interface FriendsVisitedCityGroup {
    citySlug: string;
    cityName: string;
    countryName: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    friends: FriendBrief[];
}

export interface FriendsVisitedPlaceGroup {
    placeKey: string;
    placeName: string;
    placeCity: string;
    placeCountry: string;
    latitude: number;
    longitude: number;
    friends: FriendBrief[];
}

export interface FriendsVisitedAllResult {
    countries: FriendsVisitedCountryGroup[];
    cities: FriendsVisitedCityGroup[];
    places: FriendsVisitedPlaceGroup[];
}

interface FriendBriefRaw {
    user_id: string;
    name: string;
    profile_image_url: string | null;
}

interface FriendsVisitedAllRaw {
    countries: {
        country_code: string;
        country_name: string;
        friends: FriendBriefRaw[];
    }[];
    cities: {
        city_slug: string;
        city_name: string;
        country_name: string;
        country_code: string;
        latitude: number;
        longitude: number;
        friends: FriendBriefRaw[];
    }[];
    places: {
        place_key: string;
        place_name: string;
        place_city: string;
        place_country: string;
        latitude: number;
        longitude: number;
        friends: FriendBriefRaw[];
    }[];
}

const toBrief = (f: FriendBriefRaw): FriendBrief => ({
    userId: f.user_id,
    name: f.name,
    profileImageUrl: f.profile_image_url,
});

export const fetchFriendsVisitedAll =
    async (): Promise<FriendsVisitedAllResult> => {
        const resp = await fetch(`${API_BASE}/me/friends-visited/all`, {
            headers: authHeaders(),
        });
        if (!resp.ok) {
            throw new Error(`/me/friends-visited/all ${resp.status}`);
        }
        const body = (await resp.json()) as FriendsVisitedAllRaw;
        return {
            countries: body.countries.map((c) => ({
                countryCode: c.country_code,
                countryName: c.country_name,
                friends: c.friends.map(toBrief),
            })),
            cities: body.cities.map((c) => ({
                citySlug: c.city_slug,
                cityName: c.city_name,
                countryName: c.country_name,
                countryCode: c.country_code,
                latitude: c.latitude,
                longitude: c.longitude,
                friends: c.friends.map(toBrief),
            })),
            places: body.places.map((p) => ({
                placeKey: p.place_key,
                placeName: p.place_name,
                placeCity: p.place_city,
                placeCountry: p.place_country,
                latitude: p.latitude,
                longitude: p.longitude,
                friends: p.friends.map(toBrief),
            })),
        };
    };

export const fetchFriendsVisited = async (
    kind: FriendsVisitedKind,
    key: string,
    /** The page's synthetic review-slug (city / country pages only).
     *  Lets the backend attach each friend's city/country review, whose
     *  key differs from the visited city_slug / country code. Places
     *  don't need it — their place_key already IS the review key. */
    reviewKey?: string | null,
): Promise<FriendsVisitedResult> => {
    const params = reviewKey
        ? `?review_key=${encodeURIComponent(reviewKey)}`
        : '';
    const resp = await fetch(
        `${API_BASE}/me/friends-visited/${kind}/${encodeURIComponent(
            key,
        )}${params}`,
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
