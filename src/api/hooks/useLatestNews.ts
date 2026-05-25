import { useQuery } from '@tanstack/react-query';
import { fetchTopNews, type LatestNewsResult } from 'api/newsApi';

/** 30-minute client cache matches the backend's edge-cache TTL so a
 *  user revisiting the same destination within the hour doesn't fire
 *  a fresh network roundtrip. */
const THIRTY_MINUTES = 30 * 60 * 1000;

/** Top Google News story for the given query (typically a city or
 *  country name + "travel"). Returns `null` for falsy queries so the
 *  hook is safe to mount before the query is ready. */
export const useLatestNews = (query: string | null | undefined) => {
    const trimmed = (query ?? '').trim();
    return useQuery<LatestNewsResult>({
        queryKey: ['latest-news', trimmed.toLowerCase()],
        queryFn: () => fetchTopNews(trimmed),
        enabled: trimmed.length > 0,
        staleTime: THIRTY_MINUTES,
        // Backend returns 502 when Google is unreachable. Don't retry —
        // the next visit will hit the edge cache or the next time the
        // upstream is up. Retrying just makes the widget feel sluggish
        // for the rare bad-luck loads.
        retry: 0,
    });
};
