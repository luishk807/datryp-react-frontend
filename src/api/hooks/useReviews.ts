import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createPlaceReview,
    deleteReview as deleteReviewReq,
    fetchPlaceReviews,
    likeReview as likeReviewReq,
    unlikeReview as unlikeReviewReq,
    updateReview as updateReviewReq,
    type ReviewCreatePayload,
    type ReviewUpdatePayload,
    type ReviewsResponse,
} from 'api/reviewsApi';

const reviewsKey = (placeKey: string) => ['reviews', placeKey];

/**
 * Reviews for a place. Public — anonymous callers still get the list, but
 * without viewer-scoped fields. We don't disable the query when logged-out
 * because we want the list visible regardless of auth state.
 */
export const usePlaceReviews = (placeKey: string | null) =>
    useQuery<ReviewsResponse>({
        queryKey: reviewsKey(placeKey ?? ''),
        queryFn: () => fetchPlaceReviews(placeKey as string),
        enabled: Boolean(placeKey),
        staleTime: 60 * 1000,
    });

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
            qc.invalidateQueries({ queryKey: reviewsKey(placeKey) });
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
            qc.invalidateQueries({ queryKey: reviewsKey(placeKey) });
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
            qc.invalidateQueries({ queryKey: reviewsKey(placeKey) });
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
            qc.invalidateQueries({ queryKey: reviewsKey(placeKey) });
        },
    });
};
