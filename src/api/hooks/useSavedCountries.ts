import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchSavedCountries,
    saveCountry as saveCountryReq,
    unsaveCountry as unsaveCountryReq,
    type SavedCountriesResponse,
} from 'api/savedCountriesApi';
import { useUser } from 'context/UserContext';

export const savedCountriesKey = ['me', 'saved', 'countries'] as const;

/**
 * Current user's saved-country list, newest first. Only fires when a
 * user is signed in. The cached list drives the "is this country
 * bookmarked?" check inside `BookmarkCountryButton`.
 */
export const useSavedCountries = () => {
    const { user } = useUser();
    return useQuery<SavedCountriesResponse>({
        queryKey: savedCountriesKey,
        queryFn: fetchSavedCountries,
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};

export const useSaveCountry = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => saveCountryReq(code),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: savedCountriesKey });
        },
    });
};

export const useUnsaveCountry = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => unsaveCountryReq(code),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: savedCountriesKey });
        },
    });
};
