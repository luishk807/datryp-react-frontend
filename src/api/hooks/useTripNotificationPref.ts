/**
 * Query + mutation for the current user's per-trip notification channel.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getTripNotificationPref,
    setTripNotificationPref,
    type TripNotificationPref,
} from 'api/tripNotificationPrefApi';
import type { NotifyChannel } from 'types';

const prefKey = (tripId: string) => ['tripNotificationPref', tripId];

export const useTripNotificationPref = (tripId: string | null | undefined) =>
    useQuery({
        queryKey: prefKey(tripId ?? ''),
        queryFn: () => getTripNotificationPref(tripId as string),
        enabled: Boolean(tripId),
    });

export const useSetTripNotificationPref = (tripId: string) => {
    const queryClient = useQueryClient();
    return useMutation<TripNotificationPref, Error, NotifyChannel | null>({
        mutationFn: (channel) => setTripNotificationPref(tripId, channel),
        onSuccess: (data) => {
            queryClient.setQueryData(prefKey(tripId), data);
        },
    });
};
