import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    fetchMaintenanceStatus,
    updateMaintenance,
    type MaintenanceStatus,
    type MaintenanceUpdate,
} from 'api/maintenanceApi';
import { useUser } from 'context/UserContext';

export const maintenanceKeys = {
    status: ['maintenance', 'status'] as const,
};

// The public status is polled on a short interval so a flip from the
// dashboard reaches every open tab within ~30s without a reload — matching
// the backend's 15s service-layer cache. Also refetches on window focus so
// switching back to the tab shows the current state immediately.
const POLL_INTERVAL_MS = 30 * 1000;

/** Public, unauthenticated maintenance status. Used app-wide by
 *  `MaintenanceGate`. A failed fetch (e.g. backend down) leaves `data`
 *  undefined — the gate treats that as "no maintenance" and lets
 *  `ServerGate` own the unreachable-backend case instead. */
export const useMaintenanceStatus = () =>
    useQuery<MaintenanceStatus>({
        queryKey: maintenanceKeys.status,
        queryFn: fetchMaintenanceStatus,
        refetchInterval: POLL_INTERVAL_MS,
        refetchOnWindowFocus: true,
        staleTime: 10 * 1000,
        // One quiet retry — a transient blip shouldn't flap the banner.
        retry: 1,
    });

/** Read the maintenance setting for the admin dashboard. Reuses the public
 *  status query so the dashboard and the live banner share one cache entry
 *  and stay consistent; gated to admins for intent, though the endpoint is
 *  public anyway. */
export const useMaintenanceSetting = () => {
    const { isAdmin } = useUser();
    return useQuery<MaintenanceStatus>({
        queryKey: maintenanceKeys.status,
        queryFn: fetchMaintenanceStatus,
        enabled: isAdmin,
        staleTime: 10 * 1000,
    });
};

/** Flip maintenance on/off. On success the shared status cache is updated
 *  so both the dashboard card and the live banner reflect the change at
 *  once, ahead of the next poll. */
export const useUpdateMaintenance = () => {
    const qc = useQueryClient();
    return useMutation<MaintenanceStatus, Error, MaintenanceUpdate>({
        mutationFn: updateMaintenance,
        onSuccess: (data) => {
            qc.setQueryData(maintenanceKeys.status, data);
        },
    });
};
