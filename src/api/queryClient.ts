import { QueryClient } from '@tanstack/react-query';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Cache timings for "static-ish" detail data — country / city / place facts,
 * hero images, Google ratings, AI place recommendations. These are slow,
 * AI/3rd-party-backed endpoints whose answers barely change, so we keep them
 * fresh for an hour AND retain them in memory for the same hour.
 *
 * `gcTime` deliberately matches `staleTime`: the global default `gcTime`
 * (5 min) is shorter than these queries' 1h `staleTime`, so without this the
 * cache was evicted while still "fresh" — leaving a detail page and coming
 * back >5 min later re-hit the (multi-second) endpoint instead of painting
 * instantly. Aligning the two makes back-navigation and re-visits within the
 * session free.
 */
export const STATIC_DETAIL_CACHE = {
    staleTime: HOUR_MS,
    gcTime: HOUR_MS,
} as const;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
});
