import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchSavedCities,
    saveCity as saveCityReq,
    unsaveCity as unsaveCityReq,
    type SavedCitiesResponse,
} from 'api/savedCitiesApi';
import { useUser } from 'context/UserContext';
import type { SavedCityCreatePayload } from 'types';

export const savedCitiesKey = ['me', 'saved', 'cities'] as const;

/**
 * Current user's saved-city list, newest first. Only fires when a user
 * is signed in. The cached list drives the "is this city bookmarked?"
 * check inside `BookmarkCityButton`.
 */
export const useSavedCities = () => {
    const { user } = useUser();
    return useQuery<SavedCitiesResponse>({
        queryKey: savedCitiesKey,
        queryFn: fetchSavedCities,
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};

export const useSaveCity = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: SavedCityCreatePayload) => saveCityReq(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: savedCitiesKey });
        },
    });
};

export const useUnsaveCity = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (slug: string) => unsaveCityReq(slug),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: savedCitiesKey });
        },
    });
};
