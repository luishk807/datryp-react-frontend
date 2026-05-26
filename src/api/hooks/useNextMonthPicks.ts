import { useQuery } from '@tanstack/react-query';
import {
    fetchNextMonthPicks,
    type NextMonthPicksResult,
} from 'api/nextMonthPicksApi';
import { useUser } from 'context/UserContext';

/**
 * Homepage "best places to visit next month" picks. Backend caches the
 * computed list per-user with a 24h TTL + calendar-month invalidation,
 * so even repeated mounts during the same session don't pay any
 * meaningful cost. Client-side TanStack staleness is set to 10 min so a
 * user who saves a new destination sees the box update within that
 * window without a hard reload.
 *
 * Anonymous viewers are skipped entirely — the endpoint requires auth
 * and `enabled` here keeps us from firing a guaranteed-401 fetch.
 */
export const useNextMonthPicks = () => {
    const { user } = useUser();
    return useQuery<NextMonthPicksResult>({
        queryKey: ['me', 'next-month-picks'],
        queryFn: fetchNextMonthPicks,
        enabled: Boolean(user),
        staleTime: 10 * 60 * 1000,
        retry: 1,
    });
};
