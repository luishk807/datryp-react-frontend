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
export const useMonthlyBestPlace = () => {
    const { user, isAdmin } = useUser();
    const entitled = Boolean(user && (user.isPaidMember || isAdmin));
    return useQuery<MonthlyBestPlaceResult>({
        queryKey: ['me', 'monthly-best-place'],
        queryFn: fetchMonthlyBestPlace,
        enabled: entitled,
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });
};
