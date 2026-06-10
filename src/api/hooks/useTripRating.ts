/**
 * Reads a trip's rating (viewer's own + average + count) via
 * GET /me/trip-rating/{id}. Used by the rating card on a Completed trip.
 */
import { useQuery } from '@tanstack/react-query';
import { getTripRating } from 'api/tripRatingApi';

export const tripRatingKey = (tripId: string) =>
    ['tripRating', tripId] as const;

export const useTripRating = (tripId: string | undefined, enabled = true) =>
    useQuery({
        queryKey: tripRatingKey(tripId ?? ''),
        queryFn: () => getTripRating(tripId as string),
        enabled: Boolean(tripId) && enabled,
        staleTime: 60_000,
    });
