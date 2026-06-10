/**
 * Mutation that sets (or clears, with `rating: null`) the viewer's trip
 * rating via PUT /me/trip-rating/{id}. The endpoint returns the recomputed
 * aggregate, so we drop it straight into the query cache.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { setTripRating, type TripRating } from 'api/tripRatingApi';
import { tripRatingKey } from 'api/hooks/useTripRating';

interface SaveTripRatingVars {
    tripId: string;
    rating: number | null;
}

export const useSaveTripRating = () => {
    const queryClient = useQueryClient();
    return useMutation<TripRating, Error, SaveTripRatingVars>({
        mutationFn: ({ tripId, rating }) => setTripRating(tripId, rating),
        onSuccess: (data, { tripId }) => {
            queryClient.setQueryData(tripRatingKey(tripId), data);
        },
    });
};
