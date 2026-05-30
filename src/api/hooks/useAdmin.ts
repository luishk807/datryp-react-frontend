import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    clearCityCache as clearCityCacheReq,
    clearCountryCache as clearCountryCacheReq,
    createAdminUser as createAdminUserReq,
    fetchActivityStats,
    fetchAdminUsers,
    fetchAdminUserTrips,
    fetchAgeDistribution,
    fetchAiUsage,
    fetchCityCacheStatus,
    fetchCountryCacheStatus,
    fetchGrowth,
    fetchOverview,
    fetchSubscriptionGrowth,
    fetchSubscriptionStats,
    setUserFree as setUserFreeReq,
    setUserPro as setUserProReq,
    setUserRole as setUserRoleReq,
    softDeleteUser as softDeleteUserReq,
    type AdminUserCreatePayload,
    type CityCacheStatus,
    type CountryCacheStatus,
} from 'api/adminApi';
import {
    fetchFreeEverything,
    updateFreeEverything,
    type FreeEverythingStatus,
    type FreeEverythingUpdate,
} from 'api/adminSettingsApi';
import { useUser } from 'context/UserContext';
import type {
    ActivityStats,
    AdminUserListResponse,
    AdminUserTripsResponse,
    AgeDistributionResponse,
    AiUsageResponse,
    DashboardOverview,
    GrowthResponse,
    SubscriptionStats,
} from 'types';

/** TanStack query keys for admin reads. `users(query)` keys by the
 *  search string so each filter has its own cache slot. */
export const adminKeys = {
    overview: ['admin', 'overview'] as const,
    subscription: ['admin', 'subscription'] as const,
    activity: ['admin', 'activity'] as const,
    growth: (months: number) => ['admin', 'growth', months] as const,
    subscriptionGrowth: (months: number) =>
        ['admin', 'subscription-growth', months] as const,
    ageDistribution: ['admin', 'age-distribution'] as const,
    aiUsage: (months: number) => ['admin', 'ai-usage', months] as const,
    users: (q: string) => ['admin', 'users', q] as const,
    freeEverything: ['admin', 'free-everything'] as const,
    userTrips: (id: string) => ['admin', 'user-trips', id] as const,
    countryCache: (code: string) =>
        ['admin', 'cache', 'country', code.toUpperCase()] as const,
    cityCache: (name: string, code: string) =>
        ['admin', 'cache', 'city', code.toUpperCase(), name.trim().toLowerCase()] as const,
};

// Polling matches the "live-ish" choice — refreshes the dashboard
// counters once a minute so a new signup shows up without a reload.
const POLL_INTERVAL_MS = 60 * 1000;

const adminEnabled = (isAdmin: boolean) => isAdmin;

export const useAdminOverview = () => {
    const { isAdmin } = useUser();
    return useQuery<DashboardOverview>({
        queryKey: adminKeys.overview,
        queryFn: fetchOverview,
        enabled: adminEnabled(isAdmin),
        refetchInterval: POLL_INTERVAL_MS,
        staleTime: 10 * 1000,
    });
};

export const useAdminSubscriptionStats = () => {
    const { isAdmin } = useUser();
    return useQuery<SubscriptionStats>({
        queryKey: adminKeys.subscription,
        queryFn: fetchSubscriptionStats,
        enabled: adminEnabled(isAdmin),
        refetchInterval: POLL_INTERVAL_MS,
        staleTime: 10 * 1000,
    });
};

export const useAdminActivityStats = () => {
    const { isAdmin } = useUser();
    return useQuery<ActivityStats>({
        queryKey: adminKeys.activity,
        queryFn: fetchActivityStats,
        enabled: adminEnabled(isAdmin),
        refetchInterval: POLL_INTERVAL_MS,
        staleTime: 10 * 1000,
    });
};

export const useAdminGrowth = (months: number = 12) => {
    const { isAdmin } = useUser();
    return useQuery<GrowthResponse>({
        queryKey: adminKeys.growth(months),
        queryFn: () => fetchGrowth(months),
        enabled: adminEnabled(isAdmin),
        refetchInterval: POLL_INTERVAL_MS,
        staleTime: 30 * 1000,
    });
};

export const useAdminSubscriptionGrowth = (months: number = 12) => {
    const { isAdmin } = useUser();
    return useQuery<GrowthResponse>({
        queryKey: adminKeys.subscriptionGrowth(months),
        queryFn: () => fetchSubscriptionGrowth(months),
        enabled: adminEnabled(isAdmin),
        refetchInterval: POLL_INTERVAL_MS,
        staleTime: 30 * 1000,
    });
};

export const useAdminAgeDistribution = () => {
    const { isAdmin } = useUser();
    return useQuery<AgeDistributionResponse>({
        queryKey: adminKeys.ageDistribution,
        queryFn: fetchAgeDistribution,
        enabled: adminEnabled(isAdmin),
        refetchInterval: POLL_INTERVAL_MS,
        staleTime: 30 * 1000,
    });
};

export const useAdminAiUsage = (months: number = 12) => {
    const { isAdmin } = useUser();
    return useQuery<AiUsageResponse>({
        queryKey: adminKeys.aiUsage(months),
        queryFn: () => fetchAiUsage(months),
        enabled: adminEnabled(isAdmin),
        refetchInterval: POLL_INTERVAL_MS,
        staleTime: 30 * 1000,
    });
};

export const useAdminUsers = (q: string) => {
    const { isAdmin } = useUser();
    return useQuery<AdminUserListResponse>({
        queryKey: adminKeys.users(q),
        queryFn: () => fetchAdminUsers(q || undefined),
        enabled: adminEnabled(isAdmin),
        // User search shouldn't poll automatically — admins want a stable
        // table while they work. Refresh happens after mutations and via
        // a manual refresh button.
        staleTime: 10 * 1000,
    });
};

export const useAdminUserTrips = (id: string | null) => {
    const { isAdmin } = useUser();
    return useQuery<AdminUserTripsResponse>({
        queryKey: id ? adminKeys.userTrips(id) : ['admin', 'user-trips', 'none'],
        queryFn: () => fetchAdminUserTrips(id as string),
        enabled: adminEnabled(isAdmin) && Boolean(id),
        staleTime: 30 * 1000,
    });
};

/** Common cache-invalidation after any user mutation: the list is now
 *  stale, the overview counters might be too, and the trip drawer for
 *  the affected user could have changed. */
const useInvalidateAdminUserData = () => {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: ['admin', 'users'] });
        qc.invalidateQueries({ queryKey: adminKeys.overview });
        qc.invalidateQueries({ queryKey: adminKeys.subscription });
    };
};

export const useSetUserRole = () => {
    const invalidate = useInvalidateAdminUserData();
    return useMutation({
        mutationFn: ({ id, role }: { id: string; role: string }) =>
            setUserRoleReq(id, role),
        onSuccess: invalidate,
    });
};

export const useSetUserPro = () => {
    const invalidate = useInvalidateAdminUserData();
    return useMutation({
        mutationFn: (id: string) => setUserProReq(id),
        onSuccess: invalidate,
    });
};

export const useSetUserFree = () => {
    const invalidate = useInvalidateAdminUserData();
    return useMutation({
        mutationFn: (id: string) => setUserFreeReq(id),
        onSuccess: invalidate,
    });
};

export const useSoftDeleteUser = () => {
    const invalidate = useInvalidateAdminUserData();
    return useMutation({
        mutationFn: (id: string) => softDeleteUserReq(id),
        onSuccess: invalidate,
    });
};

export const useCreateAdminUser = () => {
    const invalidate = useInvalidateAdminUserData();
    return useMutation({
        mutationFn: (payload: AdminUserCreatePayload) =>
            createAdminUserReq(payload),
        onSuccess: invalidate,
    });
};

// ---------- cache management ----------

export const useCountryCacheStatus = (code: string | null) => {
    const { isAdmin } = useUser();
    return useQuery<CountryCacheStatus>({
        queryKey: code ? adminKeys.countryCache(code) : ['admin', 'cache', 'country', 'none'],
        queryFn: () => fetchCountryCacheStatus(code as string),
        enabled: adminEnabled(isAdmin) && Boolean(code),
        staleTime: 10 * 1000,
    });
};

export const useCityCacheStatus = (name: string | null, code: string | null) => {
    const { isAdmin } = useUser();
    const ready = Boolean(name && code);
    return useQuery<CityCacheStatus>({
        queryKey: ready
            ? adminKeys.cityCache(name as string, code as string)
            : ['admin', 'cache', 'city', 'none'],
        queryFn: () => fetchCityCacheStatus(name as string, code as string),
        enabled: adminEnabled(isAdmin) && ready,
        staleTime: 10 * 1000,
    });
};

export const useClearCountryCache = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            code,
            includeImage,
        }: {
            code: string;
            includeImage?: boolean;
        }) => clearCountryCacheReq(code, { includeImage }),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: adminKeys.countryCache(vars.code) });
        },
    });
};

export const useClearCityCache = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ name, code }: { name: string; code: string }) =>
            clearCityCacheReq(name, code),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({
                queryKey: adminKeys.cityCache(vars.name, vars.code),
            });
        },
    });
};

// ── Free-everything toggle ──────────────────────────────────────────────
/** Read the current state of the global "free everything" override.
 *  Returns `{ active, until }` — `active` is true iff the toggle is on
 *  AND not expired. The 30-second `staleTime` keeps the dashboard
 *  reactive enough to reflect manual flips from other admins without
 *  hammering the endpoint on every paint. */
export const useFreeEverything = () => {
    const { isAdmin } = useUser();
    return useQuery<FreeEverythingStatus>({
        queryKey: adminKeys.freeEverything,
        queryFn: fetchFreeEverything,
        enabled: isAdmin,
        staleTime: 30 * 1000,
    });
};

/** Flip the free-everything toggle on or off, with an optional
 *  duration. On success the cache is invalidated so the dashboard
 *  shows the new state immediately. */
export const useUpdateFreeEverything = () => {
    const qc = useQueryClient();
    return useMutation<FreeEverythingStatus, Error, FreeEverythingUpdate>({
        mutationFn: updateFreeEverything,
        onSuccess: (data) => {
            qc.setQueryData(adminKeys.freeEverything, data);
            // Also invalidate the current user's /me so isPaidMember
            // re-fetches and unlocks Pro features immediately for this
            // session (the same is_paid_member override applies to all
            // users; the admin's own profile updates first).
            qc.invalidateQueries({ queryKey: ['me'] });
        },
    });
};
