import { useQuery } from '@tanstack/react-query';
import { fetchSearchHistory, type SearchHistoryItem } from 'api/searchHistoryApi';
import { useCurrentUser } from 'api/hooks/useAuth';

/**
 * Top-10 recent searches for the current user. Only enabled when a user is
 * logged in — anonymous users get no history. Refreshed on focus so the
 * dropdown reflects the latest searches without manual refetch.
 */
export const useSearchHistory = (limit = 10) => {
    const { data: user } = useCurrentUser();
    return useQuery<SearchHistoryItem[]>({
        queryKey: ['search-history', user?.id ?? 'anon', limit],
        queryFn: () => fetchSearchHistory(limit),
        enabled: Boolean(user),
        staleTime: 30 * 1000,
        refetchOnWindowFocus: true,
    });
};
