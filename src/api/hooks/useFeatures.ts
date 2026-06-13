import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchFeatureFlags,
    fetchSmsSetting,
    updateSmsSetting,
    type FeatureFlags,
    type SmsSetting,
} from 'api/featuresApi';
import { useUser } from 'context/UserContext';

export const featureKeys = {
    flags: ['features', 'flags'] as const,
    smsSetting: ['features', 'sms-setting'] as const,
};

// The flag only changes when an admin flips it in the dashboard. We don't poll
// aggressively — a generous staleTime + refetch-on-focus is enough to pick up a
// change when the user returns to the tab, without a request on every render.
const STALE_MS = 5 * 60 * 1000;

/** Public, unauthenticated feature flags. A failed/loading fetch yields the
 *  safe default (SMS off), so UI that gates on `smsEnabled` hides SMS options
 *  until the backend confirms the feature is live. */
export const useFeatureFlags = () =>
    useQuery<FeatureFlags>({
        queryKey: featureKeys.flags,
        queryFn: fetchFeatureFlags,
        staleTime: STALE_MS,
        refetchOnWindowFocus: true,
        retry: 1,
    });

/** Convenience boolean for the common "should I show SMS options?" check.
 *  Defaults to `false` while loading or on error — we never want to flash an
 *  SMS toggle that the backend has turned off. */
export const useSmsEnabled = (): boolean =>
    useFeatureFlags().data?.smsEnabled ?? false;

/** Admin-only read of the SMS kill-switch (with the configured/effective
 *  breakdown) for the dashboard Settings card. Shares no cache with the public
 *  flag so the richer admin shape stays separate. */
export const useSmsSetting = () => {
    const { isAdmin } = useUser();
    return useQuery<SmsSetting>({
        queryKey: featureKeys.smsSetting,
        queryFn: fetchSmsSetting,
        enabled: isAdmin,
        staleTime: 10 * 1000,
    });
};

/** Flip the global SMS feature on/off. On success both the admin card and the
 *  public flag cache are updated so the dashboard and every SMS-gated surface
 *  reflect the change immediately, ahead of the next poll. */
export const useUpdateSmsSetting = () => {
    const qc = useQueryClient();
    return useMutation<SmsSetting, Error, boolean>({
        mutationFn: updateSmsSetting,
        onSuccess: (data) => {
            qc.setQueryData(featureKeys.smsSetting, data);
            qc.setQueryData<FeatureFlags>(featureKeys.flags, {
                smsEnabled: data.effective,
            });
        },
    });
};
