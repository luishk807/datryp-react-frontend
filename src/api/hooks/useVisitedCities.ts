import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchVisitedCities,
    markVisitedCity as markVisitedCityReq,
    unmarkVisitedCity as unmarkVisitedCityReq,
    type VisitedCitiesResponse,
} from 'api/visitedCitiesApi';
import { useUser } from 'context/UserContext';
import type { VisitedCityCreatePayload } from 'types';

export const visitedCitiesKey = ['me', 'visited-cities'] as const;

/**
 * Current user's visited-city list, newest first. Only fires when a user
 * is signed in. The cached list drives the "have I been to this city?"
 * check inside `VisitedCityButton`.
 */
export const useVisitedCities = () => {
    const { user } = useUser();
    return useQuery<VisitedCitiesResponse>({
        queryKey: visitedCitiesKey,
        queryFn: fetchVisitedCities,
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};

export const useMarkVisitedCity = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: VisitedCityCreatePayload) =>
            markVisitedCityReq(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: visitedCitiesKey });
        },
    });
};

export const useUnmarkVisitedCity = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (slug: string) => unmarkVisitedCityReq(slug),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: visitedCitiesKey });
        },
    });
};
