import { useQuery } from '@tanstack/react-query';
import {
    fetchMonthlyBestPlace,
    type MonthlyBestPlaceResult,
} from 'api/monthlyBestPlaceApi';
import { useUser } from 'context/UserContext';

/**
 * Personalized "best place to visit this month" — Pro only.
 * Backend returns 402 for free, 401 for anonymous; gate on Pro
 * entitlement so we never burn the round-trip.
 *
 * Backend caches per-user per-month (one OpenAI call per Pro user per
 * calendar month). Frontend cache is 30 min just so repeated mounts
 * within a session don't re-fetch.
 */
export interface UseMonthlyBestPlaceOptions {
    /** When provided, the query only fires if BOTH this flag and the
     *  Pro/admin entitlement check pass. Callers that only want the
     *  data on specific routes (e.g. the country page's seed CTA) can
     *  set this to `false` on routes where the data isn't needed. */
    enabled?: boolean;
}

export const useMonthlyBestPlace = (
    options: UseMonthlyBestPlaceOptions = {}
) => {
    const { user, isAdmin } = useUser();
    const entitled = Boolean(user && (user.isPaidMember || isAdmin));
    const callerEnabled = options.enabled ?? true;
    return useQuery<MonthlyBestPlaceResult>({
        queryKey: ['me', 'monthly-best-place'],
        queryFn: fetchMonthlyBestPlace,
        enabled: entitled && callerEnabled,
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });
};
