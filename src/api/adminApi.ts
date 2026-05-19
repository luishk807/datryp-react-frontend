/**
 * REST wrappers for the `/admin/...` endpoints. All gated server-side
 * to `User.is_admin == True` — anonymous callers get 401, authenticated
 * non-admins get 403, valid admins get the response. The frontend
 * mirrors the gate via `useUser().isAdmin` so non-admins never see the
 * dashboard at all.
 */
import { getAuthToken } from './authStorage';
import type {
    ActivityStats,
    AdminUser,
    AdminUserListResponse,
    AdminUserTripsResponse,
    AgeDistributionResponse,
    AiUsageResponse,
    DashboardOverview,
    GrowthResponse,
    SubscriptionStats,
} from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

// ---------- raw wire shapes ----------

interface RecentSignupRaw {
    id: string;
    email: string;
    name: string | null;
    role: string;
    subscription_plan: string;
    subscription_status: string;
    created_at: string;
}

interface DashboardOverviewRaw {
    total_users: number;
    signups_last_7_days: number;
    signups_last_30_days: number;
    paid_members: number;
    free_users: number;
    admin_count: number;
    recent_signups: RecentSignupRaw[];
}

interface SubscriptionStatsRaw {
    by_plan: { key: string; count: number }[];
    by_status: { key: string; count: number }[];
    active_trials: number;
    cancelling_at_period_end: number;
}

interface TopCountryRaw {
    country_id: string;
    country_name: string;
    country_code: string;
    search_clicks: number;
}

interface TopSavedPlaceRaw {
    place_key: string;
    place_name: string;
    place_city: string;
    place_country: string;
    unique_savers: number;
}

interface ActivityStatsRaw {
    total_trips: number;
    total_reviews: number;
    search_events_last_30_days: number;
    total_search_events: number;
    top_countries: TopCountryRaw[];
    top_saved_places: TopSavedPlaceRaw[];
}

interface MonthlyCountPointRaw {
    month: string;
    count: number;
}

interface GrowthResponseRaw {
    months: MonthlyCountPointRaw[];
}

interface AiUsagePointRaw {
    month: string;
    total_searches: number;
    ai_calls: number;
    cache_hits: number;
    estimated_cost_usd: number;
}

interface AiUsageResponseRaw {
    months: AiUsagePointRaw[];
    total_ai_calls: number;
    total_cache_hits: number;
    total_estimated_cost_usd: number;
    estimated_cost_per_call_usd: number;
}

interface AdminUserRaw {
    id: string;
    email: string;
    name: string | null;
    role: string;
    subscription_plan: string;
    subscription_status: string;
    is_paid_member: boolean;
    subscription_cancel_at_period_end: boolean;
    current_period_end: string | null;
    trial_ends_at: string | null;
    trip_count: number;
    created_at: string;
}

interface AdminUserListResponseRaw {
    items: AdminUserRaw[];
    total: number;
}

interface AdminUserTripRaw {
    id: string;
    name: string | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
}

interface AdminUserTripsResponseRaw {
    items: AdminUserTripRaw[];
}

// ---------- helpers ----------

const authHeaders = (): Record<string, string> => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleError = async (resp: Response, label: string): Promise<never> => {
    let detail: string | undefined;
    try {
        const body = await resp.json();
        if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
        /* ignore */
    }
    throw new Error(
        `${label} ${resp.status} ${resp.statusText}${detail ? ` — ${detail}` : ''}`
    );
};

const toUser = (r: AdminUserRaw): AdminUser => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role as AdminUser['role'],
    subscriptionPlan: r.subscription_plan as AdminUser['subscriptionPlan'],
    subscriptionStatus: r.subscription_status as AdminUser['subscriptionStatus'],
    isPaidMember: r.is_paid_member,
    subscriptionCancelAtPeriodEnd: r.subscription_cancel_at_period_end,
    currentPeriodEnd: r.current_period_end,
    trialEndsAt: r.trial_ends_at,
    tripCount: r.trip_count,
    createdAt: r.created_at,
});

// ---------- dashboard tiles ----------

export const fetchOverview = async (): Promise<DashboardOverview> => {
    const resp = await fetch(`${API_BASE}/admin/dashboard/overview`, {
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, '/admin/dashboard/overview');
    const r = (await resp.json()) as DashboardOverviewRaw;
    return {
        totalUsers: r.total_users,
        signupsLast7Days: r.signups_last_7_days,
        signupsLast30Days: r.signups_last_30_days,
        paidMembers: r.paid_members,
        freeUsers: r.free_users,
        adminCount: r.admin_count,
        recentSignups: r.recent_signups.map((s) => ({
            id: s.id,
            email: s.email,
            name: s.name,
            role: s.role as DashboardOverview['recentSignups'][number]['role'],
            subscriptionPlan:
                s.subscription_plan as DashboardOverview['recentSignups'][number]['subscriptionPlan'],
            subscriptionStatus:
                s.subscription_status as DashboardOverview['recentSignups'][number]['subscriptionStatus'],
            createdAt: s.created_at,
        })),
    };
};

export const fetchSubscriptionStats = async (): Promise<SubscriptionStats> => {
    const resp = await fetch(`${API_BASE}/admin/dashboard/subscription`, {
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, '/admin/dashboard/subscription');
    const r = (await resp.json()) as SubscriptionStatsRaw;
    return {
        byPlan: r.by_plan,
        byStatus: r.by_status,
        activeTrials: r.active_trials,
        cancellingAtPeriodEnd: r.cancelling_at_period_end,
    };
};

export const fetchGrowth = async (months = 12): Promise<GrowthResponse> => {
    const resp = await fetch(
        `${API_BASE}/admin/dashboard/growth?months=${months}`,
        { headers: authHeaders() }
    );
    if (!resp.ok) await handleError(resp, '/admin/dashboard/growth');
    const r = (await resp.json()) as GrowthResponseRaw;
    return { months: r.months };
};

export const fetchSubscriptionGrowth = async (
    months = 12
): Promise<GrowthResponse> => {
    const resp = await fetch(
        `${API_BASE}/admin/dashboard/subscription-growth?months=${months}`,
        { headers: authHeaders() }
    );
    if (!resp.ok)
        await handleError(resp, '/admin/dashboard/subscription-growth');
    const r = (await resp.json()) as GrowthResponseRaw;
    return { months: r.months };
};

export const fetchAgeDistribution =
    async (): Promise<AgeDistributionResponse> => {
        const resp = await fetch(
            `${API_BASE}/admin/dashboard/age-distribution`,
            { headers: authHeaders() }
        );
        if (!resp.ok)
            await handleError(resp, '/admin/dashboard/age-distribution');
        return (await resp.json()) as AgeDistributionResponse;
    };

export const fetchAiUsage = async (months = 12): Promise<AiUsageResponse> => {
    const resp = await fetch(
        `${API_BASE}/admin/dashboard/ai-usage?months=${months}`,
        { headers: authHeaders() }
    );
    if (!resp.ok) await handleError(resp, '/admin/dashboard/ai-usage');
    const r = (await resp.json()) as AiUsageResponseRaw;
    return {
        months: r.months.map((m) => ({
            month: m.month,
            totalSearches: m.total_searches,
            aiCalls: m.ai_calls,
            cacheHits: m.cache_hits,
            estimatedCostUsd: m.estimated_cost_usd,
        })),
        totalAiCalls: r.total_ai_calls,
        totalCacheHits: r.total_cache_hits,
        totalEstimatedCostUsd: r.total_estimated_cost_usd,
        estimatedCostPerCallUsd: r.estimated_cost_per_call_usd,
    };
};

export const fetchActivityStats = async (): Promise<ActivityStats> => {
    const resp = await fetch(`${API_BASE}/admin/dashboard/activity`, {
        headers: authHeaders(),
    });
    if (!resp.ok) await handleError(resp, '/admin/dashboard/activity');
    const r = (await resp.json()) as ActivityStatsRaw;
    return {
        totalTrips: r.total_trips,
        totalReviews: r.total_reviews,
        searchEventsLast30Days: r.search_events_last_30_days,
        totalSearchEvents: r.total_search_events,
        topCountries: r.top_countries.map((c) => ({
            countryId: c.country_id,
            countryName: c.country_name,
            countryCode: c.country_code,
            searchClicks: c.search_clicks,
        })),
        topSavedPlaces: r.top_saved_places.map((p) => ({
            placeKey: p.place_key,
            placeName: p.place_name,
            placeCity: p.place_city,
            placeCountry: p.place_country,
            uniqueSavers: p.unique_savers,
        })),
    };
};

// ---------- users ----------

export interface AdminUserCreatePayload {
    email: string;
    password: string;
    name?: string | null;
    birthYear?: number | null;
    phone?: string | null;
    role?: 'user' | 'admin';
}

export const createAdminUser = async (
    payload: AdminUserCreatePayload
): Promise<AdminUser> => {
    const resp = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
            email: payload.email,
            password: payload.password,
            name: payload.name ?? null,
            birth_year: payload.birthYear ?? null,
            phone: payload.phone ?? null,
            role: payload.role ?? 'user',
        }),
    });
    if (!resp.ok) await handleError(resp, 'create user');
    return toUser((await resp.json()) as AdminUserRaw);
};

export const fetchAdminUsers = async (
    q: string | undefined,
    limit: number = 50
): Promise<AdminUserListResponse> => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', String(limit));
    const resp = await fetch(
        `${API_BASE}/admin/users?${params.toString()}`,
        { headers: authHeaders() }
    );
    if (!resp.ok) await handleError(resp, '/admin/users');
    const body = (await resp.json()) as AdminUserListResponseRaw;
    return {
        items: body.items.map(toUser),
        total: body.total,
    };
};

export const fetchAdminUserTrips = async (
    userId: string
): Promise<AdminUserTripsResponse> => {
    const resp = await fetch(
        `${API_BASE}/admin/users/${encodeURIComponent(userId)}/trips`,
        { headers: authHeaders() }
    );
    if (!resp.ok) await handleError(resp, '/admin/users/{id}/trips');
    const body = (await resp.json()) as AdminUserTripsResponseRaw;
    return {
        items: body.items.map((t) => ({
            id: t.id,
            name: t.name,
            startDate: t.start_date,
            endDate: t.end_date,
            createdAt: t.created_at,
        })),
    };
};

export const setUserRole = async (
    userId: string,
    role: string
): Promise<AdminUser> => {
    const resp = await fetch(
        `${API_BASE}/admin/users/${encodeURIComponent(userId)}/role`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ role }),
        }
    );
    if (!resp.ok) await handleError(resp, 'set role');
    return toUser((await resp.json()) as AdminUserRaw);
};

export const setUserPro = async (userId: string): Promise<AdminUser> => {
    const resp = await fetch(
        `${API_BASE}/admin/users/${encodeURIComponent(userId)}/subscription/pro`,
        { method: 'POST', headers: authHeaders() }
    );
    if (!resp.ok) await handleError(resp, 'set pro');
    return toUser((await resp.json()) as AdminUserRaw);
};

export const setUserFree = async (userId: string): Promise<AdminUser> => {
    const resp = await fetch(
        `${API_BASE}/admin/users/${encodeURIComponent(userId)}/subscription/free`,
        { method: 'POST', headers: authHeaders() }
    );
    if (!resp.ok) await handleError(resp, 'set free');
    return toUser((await resp.json()) as AdminUserRaw);
};

export const softDeleteUser = async (userId: string): Promise<void> => {
    const resp = await fetch(
        `${API_BASE}/admin/users/${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: authHeaders() }
    );
    if (!resp.ok) await handleError(resp, 'delete user');
};
