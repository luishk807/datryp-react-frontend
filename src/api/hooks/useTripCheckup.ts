/**
 * Cached Trip Checkup query. Switched from useMutation to useQuery so
 * the score persists across mounts inside the session — re-opening
 * the trip view reuses the cached result instead of firing a fresh
 * (paid) AI call. `staleTime: 1h` keeps planning-session re-visits
 * cheap; `enabled` gates on Pro + Planning so we don't fire for
 * users who can't see the result anyway.
 *
 * Forced refetch via `queryClient.invalidateQueries` or the hook's
 * `refetch` — the FE exposes a small "Re-check" affordance that the
 * user can hit after editing the trip.
 */
import { useQuery } from '@tanstack/react-query';
import {
    fetchTripCheckup,
    type TripCheckupResult,
} from 'api/tripCheckupApi';

export const tripCheckupKey = (tripId: string) =>
    ['me', 'trip-checkup', tripId] as const;

interface UseTripCheckupOptions {
    tripId: string;
    /** Gate the call on the caller's Pro + Planning preconditions.
     *  When false the hook is a no-op so a free user never burns an
     *  AI call AND the BE's 402 doesn't poison the cache. */
    enabled: boolean;
}

export const useTripCheckup = ({
    tripId,
    enabled,
}: UseTripCheckupOptions) =>
    useQuery<TripCheckupResult>({
        queryKey: tripCheckupKey(tripId),
        queryFn: () => fetchTripCheckup(tripId),
        enabled,
        // 1 hour — long enough that re-opening the trip within a
        // planning session reuses the score; short enough that an
        // overnight come-back gets a fresh evaluation.
        staleTime: 60 * 60 * 1000,
        // Don't auto-retry on error — the BE 4xx codes (402 / 403 /
        // 404 / 409) are not transient and a retry just wastes the
        // call. Server errors (5xx) get one bounce.
        retry: (failureCount, error) => {
            if (failureCount >= 1) return false;
            const status = (error as { status?: number })?.status;
            if (typeof status === 'number' && status < 500) return false;
            return true;
        },
        refetchOnWindowFocus: false,
    });
