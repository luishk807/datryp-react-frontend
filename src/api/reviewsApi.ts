/**
 * REST wrappers for the Python backend's review endpoints.
 *
 * All write paths require a Bearer token; the read path (list reviews) is
 * public but adds the viewer-scoped fields (`viewerHasLiked`, `isOwner`,
 * `friendLikers`) when a token is present.
 */
import { getAuthToken } from './authStorage';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

export interface ReviewAuthor {
    id: string;
    name: string | null;
}

export interface FriendLiker {
    id: string;
    name: string | null;
    email: string;
}

export interface ReviewItem {
    id: string;
    author: ReviewAuthor;
    rating: number;
    text: string | null;
    tags: string[];
    expectations: string | null;
    visibility: string;
    isVerifiedVisit: boolean;
    createdAt: string;
    updatedAt: string;
    likeCount: number;
    viewerHasLiked: boolean;
    isOwner: boolean;
    friendLikers: FriendLiker[];
}

export type ReviewSort = 'recent' | 'highest' | 'lowest';

export interface ReviewsResponse {
    placeKey: string;
    total: number;
    averageRating: number | null;
    ratingCounts: Record<string, number>;
    viewerReviewId: string | null;
    items: ReviewItem[];
    /** 1-based current page. */
    page: number;
    pageSize: number;
    totalPages: number;
    sort: ReviewSort;
}

export interface ReviewQueryParams {
    page?: number;
    pageSize?: number;
    sort?: ReviewSort;
}

export interface ReviewCreatePayload {
    placeName: string;
    placeCity: string;
    placeCountry: string;
    rating: number;
    text?: string | null;
}

/** Body for the save-on-star upsert. Beyond the base create fields it carries
 *  the structured chips + expectations + visibility, and the source trip /
 *  activity the review was authored from (marks it a verified visit). */
export interface ReviewUpsertPayload extends ReviewCreatePayload {
    tags?: string[];
    expectations?: string | null;
    visibility?: string;
    itineraryId?: string | null;
    activityId?: string | null;
}

export interface ReviewUpdatePayload {
    rating?: number;
    text?: string | null;
    tags?: string[];
    expectations?: string | null;
    visibility?: string;
}

/** One aggregated chip for a place: slug + how many travelers used it + what
 *  share of reviewers that is (0-100). */
export interface ReviewInsightChip {
    slug: string;
    count: number;
    pct: number;
}

export interface ReviewExpectationsBreakdown {
    total: number;
    better: number;
    asExpected: number;
    overhyped: number;
    livedUpPct: number;
}

export interface ReviewInsights {
    placeKey: string;
    total: number;
    verifiedCount: number;
    averageRating: number | null;
    expectations: ReviewExpectationsBreakdown;
    topTags: ReviewInsightChip[];
}

interface ReviewItemRaw {
    id: string;
    author: ReviewAuthor;
    rating: number;
    text: string | null;
    tags: string[] | null;
    expectations: string | null;
    visibility: string;
    is_verified_visit: boolean;
    created_at: string;
    updated_at: string;
    like_count: number;
    viewer_has_liked: boolean;
    is_owner: boolean;
    friend_likers: FriendLiker[];
}

interface ReviewsResponseRaw {
    place_key: string;
    total: number;
    average_rating: number | null;
    rating_counts: Record<string, number>;
    viewer_review_id: string | null;
    items: ReviewItemRaw[];
    page: number;
    page_size: number;
    total_pages: number;
    sort: ReviewSort;
}

const toItem = (r: ReviewItemRaw): ReviewItem => ({
    id: r.id,
    author: r.author,
    rating: r.rating,
    text: r.text,
    tags: r.tags ?? [],
    expectations: r.expectations,
    visibility: r.visibility,
    isVerifiedVisit: r.is_verified_visit,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    likeCount: r.like_count,
    viewerHasLiked: r.viewer_has_liked,
    isOwner: r.is_owner,
    friendLikers: r.friend_likers,
});

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleError = async (resp: Response, label: string): Promise<never> => {
    let detail: string | undefined;
    try {
        const body = await resp.json();
        if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
        /* ignore */
    }
    throw new Error(`${label} ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`);
};

export const fetchPlaceReviews = async (
    placeKey: string,
    params: ReviewQueryParams = {}
): Promise<ReviewsResponse> => {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    qs.set('page_size', String(params.pageSize ?? 10));
    qs.set('sort', params.sort ?? 'recent');
    const resp = await fetch(
        `${API_BASE}/places/${encodeURIComponent(placeKey)}/reviews?${qs}`,
        { headers: authHeaders() }
    );
    if (!resp.ok) await handleError(resp, '/places/:key/reviews');
    const body = (await resp.json()) as ReviewsResponseRaw;
    return {
        placeKey: body.place_key,
        total: body.total,
        averageRating: body.average_rating,
        ratingCounts: body.rating_counts,
        viewerReviewId: body.viewer_review_id,
        items: body.items.map(toItem),
        page: body.page,
        pageSize: body.page_size,
        totalPages: body.total_pages,
        sort: body.sort,
    };
};

export const createPlaceReview = async (
    placeKey: string,
    payload: ReviewCreatePayload
): Promise<ReviewItem> => {
    const resp = await fetch(`${API_BASE}/places/${encodeURIComponent(placeKey)}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({
            place_name: payload.placeName,
            place_city: payload.placeCity,
            place_country: payload.placeCountry,
            rating: payload.rating,
            text: payload.text ?? null,
        }),
    });
    if (!resp.ok) await handleError(resp, 'create review');
    return toItem((await resp.json()) as ReviewItemRaw);
};

export const upsertPlaceReview = async (
    placeKey: string,
    payload: ReviewUpsertPayload
): Promise<ReviewItem> => {
    const resp = await fetch(`${API_BASE}/places/${encodeURIComponent(placeKey)}/reviews`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({
            place_name: payload.placeName,
            place_city: payload.placeCity,
            place_country: payload.placeCountry,
            rating: payload.rating,
            text: payload.text ?? null,
            tags: payload.tags ?? [],
            expectations: payload.expectations ?? null,
            visibility: payload.visibility ?? 'public',
            itinerary_id: payload.itineraryId ?? null,
            activity_id: payload.activityId ?? null,
        }),
    });
    if (!resp.ok) await handleError(resp, 'upsert review');
    return toItem((await resp.json()) as ReviewItemRaw);
};

/** The caller's own review for a place, or null if they haven't reviewed it. */
export const fetchMyPlaceReview = async (
    placeKey: string
): Promise<ReviewItem | null> => {
    const resp = await fetch(`${API_BASE}/me/reviews/${encodeURIComponent(placeKey)}`, {
        headers: { ...authHeaders() },
    });
    if (!resp.ok) await handleError(resp, 'get my review');
    const body = (await resp.json()) as ReviewItemRaw | null;
    return body ? toItem(body) : null;
};

export const fetchReviewInsights = async (
    placeKey: string
): Promise<ReviewInsights> => {
    const resp = await fetch(
        `${API_BASE}/places/${encodeURIComponent(placeKey)}/review-insights`,
        { headers: { ...authHeaders() } }
    );
    if (!resp.ok) await handleError(resp, 'review insights');
    const body = (await resp.json()) as {
        place_key: string;
        total: number;
        verified_count: number;
        average_rating: number | null;
        expectations: {
            total: number;
            better: number;
            as_expected: number;
            overhyped: number;
            lived_up_pct: number;
        };
        top_tags: ReviewInsightChip[];
    };
    return {
        placeKey: body.place_key,
        total: body.total,
        verifiedCount: body.verified_count,
        averageRating: body.average_rating,
        expectations: {
            total: body.expectations.total,
            better: body.expectations.better,
            asExpected: body.expectations.as_expected,
            overhyped: body.expectations.overhyped,
            livedUpPct: body.expectations.lived_up_pct,
        },
        topTags: body.top_tags,
    };
};

export const updateReview = async (
    reviewId: string,
    payload: ReviewUpdatePayload
): Promise<ReviewItem> => {
    const resp = await fetch(`${API_BASE}/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders(),
        },
        body: JSON.stringify({
            rating: payload.rating,
            text: payload.text,
            tags: payload.tags,
            expectations: payload.expectations,
            visibility: payload.visibility,
        }),
    });
    if (!resp.ok) await handleError(resp, 'update review');
    return toItem((await resp.json()) as ReviewItemRaw);
};

export const deleteReview = async (reviewId: string): Promise<void> => {
    const resp = await fetch(`${API_BASE}/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, 'delete review');
};

export const likeReview = async (reviewId: string): Promise<void> => {
    const resp = await fetch(`${API_BASE}/reviews/${encodeURIComponent(reviewId)}/like`, {
        method: 'POST',
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, 'like review');
};

export const unlikeReview = async (reviewId: string): Promise<void> => {
    const resp = await fetch(`${API_BASE}/reviews/${encodeURIComponent(reviewId)}/like`, {
        method: 'DELETE',
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, 'unlike review');
};
