/**
 * Mutation hook for Trip Checkup. Pro-gated server-side (402 for free);
 * UI also hides the trigger when the viewer isn't Pro.
 */
import { useMutation } from '@tanstack/react-query';
import {
    fetchTripCheckup,
    type TripCheckupResult,
} from 'api/tripCheckupApi';

interface UseTripCheckupInput {
    tripId: string;
}

export const useTripCheckup = () =>
    useMutation<TripCheckupResult, Error, UseTripCheckupInput>({
        mutationFn: ({ tripId }) => fetchTripCheckup(tripId),
    });
