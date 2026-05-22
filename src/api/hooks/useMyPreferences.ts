import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchGendersCatalog,
    fetchInterestsCatalog,
    fetchMyPreferences,
    fetchTravelerStylesCatalog,
    updateMyPreferences,
} from 'api/preferencesApi';
import { useUser } from 'context/UserContext';
import { queryKeys } from 'api/queryKeys';
import type {
    GenderOption,
    InterestOption,
    Preferences,
    PreferencesUpdate,
    TravelerStyleOption,
} from 'types';

/** Query key for the standalone `/me/preferences` query. Listed in
 *  `queryKeys` for consistency, but exported here for callers that need
 *  to invalidate. */
export const preferencesKey = ['me', 'preferences'] as const;

/** Static-ish chip catalog. Cached for the session — the underlying list
 *  is a hard-coded constant on the backend, so once is enough. */
export const interestsCatalogKey = ['me', 'interests-catalog'] as const;

export const travelerStylesCatalogKey = ['me', 'traveler-styles-catalog'] as const;

export const gendersCatalogKey = ['me', 'genders-catalog'] as const;

export const useMyPreferences = () => {
    const { user } = useUser();
    return useQuery<Preferences>({
        queryKey: preferencesKey,
        queryFn: fetchMyPreferences,
        enabled: Boolean(user),
        staleTime: 5 * 60 * 1000,
    });
};

export const useInterestsCatalog = () =>
    useQuery<InterestOption[]>({
        queryKey: interestsCatalogKey,
        queryFn: fetchInterestsCatalog,
        // Effectively immutable — the catalog only changes when the backend
        // constant is edited and the app is redeployed.
        staleTime: Infinity,
        retry: 1,
    });

export const useTravelerStylesCatalog = () =>
    useQuery<TravelerStyleOption[]>({
        queryKey: travelerStylesCatalogKey,
        queryFn: fetchTravelerStylesCatalog,
        staleTime: Infinity,
        retry: 1,
    });

export const useGendersCatalog = () =>
    useQuery<GenderOption[]>({
        queryKey: gendersCatalogKey,
        queryFn: fetchGendersCatalog,
        // Catalog is seeded, never grows at runtime — cache for the
        // session.
        staleTime: Infinity,
        retry: 1,
    });

export const useUpdateMyPreferences = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: PreferencesUpdate) => updateMyPreferences(payload),
        onSuccess: (data) => {
            qc.setQueryData(preferencesKey, data);
            // /auth/me embeds the same fields — invalidate so the
            // UserContext picks up the new state (which gates the
            // wizard's auto-launch).
            qc.invalidateQueries({ queryKey: queryKeys.currentUser });
        },
    });
};
