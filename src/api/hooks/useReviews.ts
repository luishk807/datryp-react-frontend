import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createPlaceReview,
    deleteReview as deleteReviewReq,
    fetchPlaceReviews,
    likeReview as likeReviewReq,
    unlikeReview as unlikeReviewReq,
    updateReview as updateReviewReq,
    type ReviewCreatePayload,
    type ReviewQueryParams,
    type ReviewSort,
    type ReviewUpdatePayload,
    type ReviewsResponse,
} from 'api/reviewsApi';

const placeReviewsKey = (placeKey: string) => ['reviews', placeKey] as const;

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
