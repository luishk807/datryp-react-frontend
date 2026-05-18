import { useQuery } from '@tanstack/react-query';
import { fetchMonthlyTopCities } from 'api/topCitiesMonthlyApi';
import type { MonthlyTopCitiesResult } from 'types';

/**
 * Top 6 cities to travel in the current month. Backend caches one row per
 * `YYYY-MM`, so this hook can be called freely across the app — first call
 * each month per environment burns one OpenAI + 6 Unsplash hits, all
 * subsequent calls (regardless of user) are served instantly from DB.
 *
 * Client-side cache is long-lived (24h) since the underlying list only
 * changes monthly. Anonymous-friendly — no auth required.
 */
export const useMonthlyTopCities = () =>
    useQuery<MonthlyTopCitiesResult>({
        queryKey: ['top-cities-monthly'],
        queryFn: fetchMonthlyTopCities,
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000,
        retry: 1,
    });
