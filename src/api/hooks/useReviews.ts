import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createPlaceReview,
    deleteReview as deleteReviewReq,
    fetchMyPlaceReview,
    fetchPlaceReviews,
    fetchReviewInsights,
    likeReview as likeReviewReq,
    unlikeReview as unlikeReviewReq,
    updateReview as updateReviewReq,
    upsertPlaceReview,
    type ReviewCreatePayload,
    type ReviewInsights,
    type ReviewItem,
    type ReviewQueryParams,
    type ReviewSort,
    type ReviewUpdatePayload,
    type ReviewUpsertPayload,
    type ReviewsResponse,
} from 'api/reviewsApi';

const placeReviewsKey = (placeKey: string) => ['reviews', placeKey] as const;
const myReviewKey = (placeKey: string) => ['myReview', placeKey] as const;
const reviewInsightsKey = (placeKey: string) =>
    ['reviewInsights', placeKey] as const;

/** The caller's own review for a place (null when unreviewed). Powers the
 *  inline activity review's prefill. Auth-only — disabled when logged out. */
export const useMyPlaceReview = (placeKey: string | null, enabled = true) =>
    useQuery<ReviewItem | null>({
        queryKey: myReviewKey(placeKey ?? ''),
        queryFn: () => fetchMyPlaceReview(placeKey as string),
        enabled: Boolean(placeKey) && enabled,
        staleTime: 60 * 1000,
    });

/** Aggregated "Verified traveler insights" for a place (chip % + expectations
 *  breakdown). Public. */
export const usePlaceReviewInsights = (placeKey: string | null, enabled = true) =>
    useQuery<ReviewInsights>({
        queryKey: reviewInsightsKey(placeKey ?? ''),
        queryFn: () => fetchReviewInsights(placeKey as string),
        enabled: Boolean(placeKey) && enabled,
        staleTime: 5 * 60 * 1000,
    });

interface UpsertReviewArgs {
    placeKey: string;
    payload: ReviewUpsertPayload;
}

/** Create-or-update the viewer's review for a place (save-on-star). Refreshes
 *  the place list, the viewer's own review, and the aggregate insights. */
export const useUpsertReview = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ placeKey, payload }: UpsertReviewArgs) =>
            upsertPlaceReview(placeKey, payload),
        onSuccess: (data, { placeKey }) => {
            qc.setQueryData(myReviewKey(placeKey), data);
            qc.invalidateQueries({ queryKey: placeReviewsKey(placeKey) });
            qc.invalidateQueries({ queryKey: reviewInsightsKey(placeKey) });
        },
    });
};

/**
 * Reviews for a place, paginated + sorted. Public — anonymous callers still
 * get the list, just without viewer-scoped fields. `keepPreviousData` keeps
 * the existing page visible while a new page loads so pagination feels
 * snappy and the layout doesn't collapse to skeletons on every nav.
 */
export const usePlaceReviews = (
    placeKey: string | null,
    params: ReviewQueryParams = {}
) => {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const sort: ReviewSort = params.sort ?? 'recent';
    return useQuery<ReviewsResponse>({
        queryKey: [...placeReviewsKey(placeKey ?? ''), page, pageSize, sort],
        queryFn: () => fetchPlaceReviews(placeKey as string, { page, pageSize, sort }),
        enabled: Boolean(placeKey),
        staleTime: 60 * 1000,
        placeholderData: keepPreviousData,
    });
};

interface CreateReviewArgs {
    placeKey: string;
    payload: ReviewCreatePayload;
}

export const useCreateReview = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ placeKey, payload }: CreateReviewArgs) =>
            createPlaceReview(placeKey, payload),
        onSuccess: (_data, { placeKey }) => {
            qc.invalidateQueries({ queryKey: placeReviewsKey(placeKey) });
        },
    });
};

interface UpdateReviewArgs {
    placeKey: string;
    reviewId: string;
    payload: ReviewUpdatePayload;
}

export const useUpdateReview = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ reviewId, payload }: UpdateReviewArgs) =>
            updateReviewReq(reviewId, payload),
        onSuccess: (_data, { placeKey }) => {
            qc.invalidateQueries({ queryKey: placeReviewsKey(placeKey) });
        },
    });
};

interface DeleteReviewArgs {
    placeKey: string;
    reviewId: string;
}

export const useDeleteReview = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ reviewId }: DeleteReviewArgs) => deleteReviewReq(reviewId),
        onSuccess: (_data, { placeKey }) => {
            qc.invalidateQueries({ queryKey: placeReviewsKey(placeKey) });
        },
    });
};

interface ToggleLikeArgs {
    placeKey: string;
    reviewId: string;
    currentlyLiked: boolean;
}

/**
 * Toggle like/unlike. Caller passes `currentlyLiked` so the mutation knows
 * which endpoint to hit — the list query is then refetched to pick up the
 * updated count + friend-likers list.
 */
export const useToggleReviewLike = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ reviewId, currentlyLiked }: ToggleLikeArgs) =>
            currentlyLiked ? unlikeReviewReq(reviewId) : likeReviewReq(reviewId),
        onSuccess: (_data, { placeKey }) => {
            qc.invalidateQueries({ queryKey: placeReviewsKey(placeKey) });
        },
    });
};
