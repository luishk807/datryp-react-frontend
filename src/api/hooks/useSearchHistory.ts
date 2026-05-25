import { useQuery } from '@tanstack/react-query';
import {
    fetchSearchHistory,
    type SearchHistoryPage,
} from 'api/searchHistoryApi';
import { useCurrentUser } from 'api/hooks/useAuth';

export interface UseSearchHistoryOptions {
    /** Page size (max 50, enforced by the backend). Defaults to 10 for
     *  the header dropdown's compact use case. */
    limit?: number;
    /** Row offset for server-side pagination (0-based). The /history
     *  page uses `(page - 1) * limit`; the header dropdown leaves it
     *  at 0. */
    offset?: number;
}

/**
 * Page of recent searches for the current user. Server-paginated via
 * offset + limit; the response carries `total` so callers can compute
 * "Page X of Y" without a second round-trip. Only enabled when a user
 * is logged in — anonymous users get no history.
 *
 * `staleTime: 30s` + `refetchOnWindowFocus` keeps the dropdown fresh
 * without manual invalidation; the per-page queryKey makes paging
 * navigations cache-friendly.
 */
export const useSearchHistory = (
    options: UseSearchHistoryOptions | number = {}
) => {
    // Back-compat: callers that pass a bare number get treated as
    // `{ limit }` to avoid breaking the existing header dropdown.
    const { limit = 10, offset = 0 } =
        typeof options === 'number' ? { limit: options } : options;
    const { data: user } = useCurrentUser();
    return useQuery<SearchHistoryPage>({
        queryKey: ['search-history', user?.id ?? 'anon', limit, offset],
        queryFn: () => fetchSearchHistory({ limit, offset }),
        enabled: Boolean(user),
        staleTime: 30 * 1000,
        refetchOnWindowFocus: true,
    });
};
