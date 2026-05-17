import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchVisited,
    markVisited as markVisitedReq,
    unmarkVisited as unmarkVisitedReq,
    type VisitedPlacesResponse,
} from 'api/visitedPlacesApi';
import { useUser } from 'context/UserContext';
import type { VisitedPlaceCreatePayload } from 'types';

export const visitedPlacesKey = ['me', 'visited'] as const;

/**
 * Current user's visited-place list, newest first. Only fires when a user
 * is signed in — anonymous callers would 401 from the auth dependency. The
 * cached list is the source of truth for "is this place visited?" checks
 * elsewhere (see `useIsPlaceVisited`).
 */
export const useVisitedPlaces = () => {
    const { user } = useUser();
    return useQuery<VisitedPlacesResponse>({
        queryKey: visitedPlacesKey,
        queryFn: fetchVisited,
        enabled: Boolean(user),
        staleTime: 60 * 1000,
    });
};

export const useMarkVisited = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: VisitedPlaceCreatePayload) => markVisitedReq(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: visitedPlacesKey });
        },
    });
};

export const useUnmarkVisited = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (placeKey: string) => unmarkVisitedReq(placeKey),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: visitedPlacesKey });
        },
    });
};
