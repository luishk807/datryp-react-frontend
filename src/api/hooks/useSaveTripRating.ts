/**
 * Mutation that sets (or clears, with `rating: null`) the viewer's trip
 * rating via PUT /me/trip-rating/{id}. The endpoint returns the recomputed
 * aggregate, so we drop it straight into the query cache.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    setTripRating,
    type TripRating,
    type TripRecapInput,
} from 'api/tripRatingApi';
import { tripRatingKey } from 'api/hooks/useTripRating';
import { tripCompanionsKey } from 'api/hooks/useTripCompanions';

interface SaveTripRatingVars {
    tripId: string;
    recap: TripRecapInput;
}

export const useSaveTripRating = () => {
    const queryClient = useQueryClient();
    return useMutation<TripRating, Error, SaveTripRatingVars>({
        mutationFn: ({ tripId, recap }) => setTripRating(tripId, recap),
        onSuccess: (data, { tripId }) => {
            queryClient.setQueryData(tripRatingKey(tripId), data);
            // The group-ratings card reads the companions endpoint (which
            // includes each member's rating) — refresh it too.
            queryClient.invalidateQueries({ queryKey: tripCompanionsKey(tripId) });
        },
    });
};
