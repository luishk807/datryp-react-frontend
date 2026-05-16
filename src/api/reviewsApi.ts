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

export interface ReviewUpdatePayload {
    rating?: number;
    text?: string | null;
}

interface ReviewItemRaw {
    id: string;
    author: ReviewAuthor;
    rating: number;
    text: string | null;
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
