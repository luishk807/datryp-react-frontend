import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchSavedPlaces,
    savePlace as savePlaceReq,
    unsavePlace as unsavePlaceReq,
    type SavedPlacesResponse,
} from 'api/savedPlacesApi';
import { useUser } from 'context/UserContext';
import type { SavedPlaceCreatePayload } from 'types';

export const savedPlacesKey = ['me', 'saved', 'places'] as const;

/**
 * Current user's saved-place list, newest first. Only fires when a user
 * is signed in. The cached list is the source of truth for "is this
 * place bookmarked?" checks elsewhere (see `BookmarkButton`).
 */
export const useSavedPlaces = () => {
    const { user } = useUser();
    return useQuery<SavedPlacesResponse>({
        queryKey: savedPlacesKey,
        queryFn: fetchSavedPlaces,
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};

export const useSavePlace = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: SavedPlaceCreatePayload) => savePlaceReq(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: savedPlacesKey });
        },
    });
};

export const useUnsavePlace = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (placeKey: string) => unsavePlaceReq(placeKey),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: savedPlacesKey });
        },
    });
};
