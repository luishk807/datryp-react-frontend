import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchVisitedCountries,
    markVisitedCountry as markVisitedCountryReq,
    unmarkVisitedCountry as unmarkVisitedCountryReq,
    type VisitedCountriesResponse,
} from 'api/visitedCountriesApi';
import { useUser } from 'context/UserContext';

export const visitedCountriesKey = ['me', 'visited-countries'] as const;

/**
 * Current user's visited-country list, newest first. Only fires when a user
 * is signed in — anonymous callers would 401 from the auth dependency. The
 * cached list is the source of truth for "have I been to this country?"
 * checks elsewhere (see `VisitedCountryButton`).
 */
export const useVisitedCountries = () => {
    const { user } = useUser();
    return useQuery<VisitedCountriesResponse>({
        queryKey: visitedCountriesKey,
        queryFn: fetchVisitedCountries,
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};

export const useMarkVisitedCountry = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => markVisitedCountryReq(code),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: visitedCountriesKey });
        },
    });
};

export const useUnmarkVisitedCountry = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => unmarkVisitedCountryReq(code),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: visitedCountriesKey });
        },
    });
};
