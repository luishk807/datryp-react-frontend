/**
 * Mutation hook for the lightbulb suggestions feature on TripDetail.
 *
 * Pro-gated server-side (402 for free users) — the UI also hides the
 * lightbulb when the viewer isn't Pro so the user never clicks into a
 * paywall they could've seen from the outset. Fresh AI call on every
 * click; no TanStack cache (handled at the component level so the user
 * can re-roll for variety).
 */
import { useMutation } from '@tanstack/react-query';
import {
    fetchTripSuggestions,
    type TripSuggestionsResult,
} from 'api/tripSuggestionsApi';

interface UseTripSuggestionsInput {
    tripId: string;
}

export const useTripSuggestions = () =>
    useMutation<TripSuggestionsResult, Error, UseTripSuggestionsInput>({
        mutationFn: ({ tripId }) => fetchTripSuggestions(tripId),
    });
