import type {
    ActivityStats,
    AdminUser,
    AdminUserListResponse,
    AdminUserTripsResponse,
    AgeDistributionResponse,
    AiUsageResponse,
    CostAnalyticsResponse,
    DashboardOverview,
    GrowthResponse,
    PostHogStatsResponse,
    SubscribersResponse,
    SubscriptionStats,
    TopSearchesResponse,
    UsersByGenderResponse,
} from 'types';
import type {
    CacheClearResult,
    CityCacheStatus,
    CountryCacheStatus,
    EssentialAppsCacheStatus,
} from 'api/adminApi';

/**
 * Wire (snake_case) + FE (camelCase) fixtures for the `/admin/...` boundary.
 * The `*Wire` objects are fed to MSW so the real client runs its `to*`
 * reshaping; the `*Fixture` objects are typed as the FE interface so they
 * can't silently drift from the type the app consumes.
 */

// ---------- overview ----------

export const overviewWire = {
    total_users: 100,
    signups_last_7_days: 5,
    signups_last_30_days: 20,
    paid_members: 10,
    free_users: 90,
    admin_count: 2,
    recent_signups: [
        {
            id: 'u1',
            email: 'al@example.com',
            name: 'Al',
            role: 'user',
            subscription_plan: 'free',
            subscription_status: 'none',
            created_at: '2026-01-01T00:00:00Z',
        },
    ],
};

export const overviewFixture: DashboardOverview = {
    totalUsers: 100,
    signupsLast7Days: 5,
    signupsLast30Days: 20,
    paidMembers: 10,
    freeUsers: 90,
    adminCount: 2,
    recentSignups: [
        {
            id: 'u1',
            email: 'al@example.com',
            name: 'Al',
            role: 'user',
            subscriptionPlan: 'free',
            subscriptionStatus: 'none',
            createdAt: '2026-01-01T00:00:00Z',
        },
    ],
};

// ---------- subscription stats ----------

export const subscriptionStatsWire = {
    by_plan: [
        { key: 'free', count: 90 },
        { key: 'pro', count: 10 },
    ],
    by_status: [
        { key: 'none', count: 90 },
        { key: 'active', count: 10 },
    ],
    active_trials: 3,
    cancelling_at_period_end: 1,
};

export const subscriptionStatsFixture: SubscriptionStats = {
    byPlan: [
        { key: 'free', count: 90 },
        { key: 'pro', count: 10 },
    ],
    byStatus: [
        { key: 'none', count: 90 },
        { key: 'active', count: 10 },
    ],
    activeTrials: 3,
    cancellingAtPeriodEnd: 1,
};

// ---------- growth (wire === FE; no reshaping) ----------

export const growthFixture: GrowthResponse = {
    months: [
        { month: '2026-01', count: 5 },
        { month: '2026-02', count: 8 },
    ],
};

// ---------- age distribution (passthrough; already camelCase) ----------

export const ageDistributionFixture: AgeDistributionResponse = {
    buckets: [
        { key: '18-24', label: '18–24', count: 12 },
        { key: '25-34', label: '25–34', count: 30 },
    ],
    total: 42,
};

// ---------- users by gender ----------

export const usersByGenderWire = {
    total: 10,
    buckets: [
        { gender_name: 'Female', count: 6 },
        { gender_name: 'Male', count: 4 },
    ],
};

export const usersByGenderFixture: UsersByGenderResponse = {
    total: 10,
    buckets: [
        { genderName: 'Female', count: 6 },
        { genderName: 'Male', count: 4 },
    ],
};

// ---------- subscribers ----------

export const subscribersWire = {
    items: [
        {
            id: 's1',
            email: 'sub@example.com',
            name: 'Sub',
            subscription_plan: 'pro',
            subscription_status: 'active',
            subscription_cancel_at_period_end: false,
            current_period_end: '2026-08-01T00:00:00Z',
            trial_ends_at: null,
            updated_at: '2026-07-01T00:00:00Z',
            created_at: '2026-06-01T00:00:00Z',
        },
    ],
    total: 1,
    page: 1,
    per_page: 20,
};

export const subscribersFixture: SubscribersResponse = {
    items: [
        {
            id: 's1',
            email: 'sub@example.com',
            name: 'Sub',
            subscriptionPlan: 'pro',
            subscriptionStatus: 'active',
            subscriptionCancelAtPeriodEnd: false,
            currentPeriodEnd: '2026-08-01T00:00:00Z',
            trialEndsAt: null,
            updatedAt: '2026-07-01T00:00:00Z',
            createdAt: '2026-06-01T00:00:00Z',
        },
    ],
    total: 1,
    page: 1,
    perPage: 20,
};

// ---------- top searches ----------

export const topSearchesWire = {
    items: [
        { query: 'bali', count: 42 },
        { query: 'tokyo', count: 30 },
    ],
    total: 2,
    page: 1,
    per_page: 20,
};

export const topSearchesFixture: TopSearchesResponse = {
    items: [
        { query: 'bali', count: 42 },
        { query: 'tokyo', count: 30 },
    ],
    total: 2,
    page: 1,
    perPage: 20,
};

// ---------- posthog ----------

export const postHogWire = {
    configured: true,
    window_days: 30,
    total_events: 1000,
    unique_users: 200,
    top_events: [{ event: 'search', count: 500 }],
    daily_events: [{ day: '2026-07-01', count: 100 }],
};

export const postHogFixture: PostHogStatsResponse = {
    configured: true,
    windowDays: 30,
    totalEvents: 1000,
    uniqueUsers: 200,
    topEvents: [{ event: 'search', count: 500 }],
    dailyEvents: [{ day: '2026-07-01', count: 100 }],
};

// ---------- AI usage ----------

export const aiUsageWire = {
    months: [
        {
            month: '2026-06',
            total_searches: 100,
            ai_calls: 40,
            cache_hits: 60,
            estimated_cost_usd: 0.4,
        },
    ],
    total_ai_calls: 40,
    total_cache_hits: 60,
    total_estimated_cost_usd: 0.4,
    estimated_cost_per_call_usd: 0.01,
};

export const aiUsageFixture: AiUsageResponse = {
    months: [
        {
            month: '2026-06',
            totalSearches: 100,
            aiCalls: 40,
            cacheHits: 60,
            estimatedCostUsd: 0.4,
        },
    ],
    totalAiCalls: 40,
    totalCacheHits: 60,
    totalEstimatedCostUsd: 0.4,
    estimatedCostPerCallUsd: 0.01,
};

// ---------- cost analytics ----------

export const costAnalyticsWire = {
    features: [
        {
            feature: 'place_details',
            label: 'Place details',
            openai_calls: 100,
            calls_per_unit: 3,
            estimated_cost_usd: 1.5,
            cached_served: 200,
            tracked: true,
            note: null,
        },
    ],
    total_openai_calls: 100,
    total_estimated_cost_usd: 1.5,
    total_cached_served: 200,
    estimated_cost_per_call_usd: 0.015,
};

export const costAnalyticsFixture: CostAnalyticsResponse = {
    features: [
        {
            feature: 'place_details',
            label: 'Place details',
            openaiCalls: 100,
            callsPerUnit: 3,
            estimatedCostUsd: 1.5,
            cachedServed: 200,
            tracked: true,
            note: null,
        },
    ],
    totalOpenaiCalls: 100,
    totalEstimatedCostUsd: 1.5,
    totalCachedServed: 200,
    estimatedCostPerCallUsd: 0.015,
};

// ---------- activity stats ----------

export const activityStatsWire = {
    total_trips: 50,
    total_reviews: 30,
    search_events_last_30_days: 200,
    total_search_events: 1000,
    top_countries: [
        {
            country_id: 'c1',
            country_name: 'Japan',
            country_code: 'JP',
            search_clicks: 80,
        },
    ],
    top_saved_places: [
        {
            place_key: 'k1',
            place_name: 'Eiffel Tower',
            place_city: 'Paris',
            place_country: 'France',
            unique_savers: 25,
        },
    ],
};

export const activityStatsFixture: ActivityStats = {
    totalTrips: 50,
    totalReviews: 30,
    searchEventsLast30Days: 200,
    totalSearchEvents: 1000,
    topCountries: [
        {
            countryId: 'c1',
            countryName: 'Japan',
            countryCode: 'JP',
            searchClicks: 80,
        },
    ],
    topSavedPlaces: [
        {
            placeKey: 'k1',
            placeName: 'Eiffel Tower',
            placeCity: 'Paris',
            placeCountry: 'France',
            uniqueSavers: 25,
        },
    ],
};

// ---------- admin user ----------

export const adminUserWire = {
    id: 'u1',
    email: 'al@example.com',
    name: 'Al',
    role: 'user',
    subscription_plan: 'free',
    subscription_status: 'none',
    is_paid_member: false,
    subscription_cancel_at_period_end: false,
    current_period_end: null,
    trial_ends_at: null,
    trip_count: 3,
    created_at: '2026-01-01T00:00:00Z',
};

export const adminUserFixture: AdminUser = {
    id: 'u1',
    email: 'al@example.com',
    name: 'Al',
    role: 'user',
    subscriptionPlan: 'free',
    subscriptionStatus: 'none',
    isPaidMember: false,
    subscriptionCancelAtPeriodEnd: false,
    currentPeriodEnd: null,
    trialEndsAt: null,
    tripCount: 3,
    createdAt: '2026-01-01T00:00:00Z',
};

export const adminUsersListWire = {
    items: [adminUserWire],
    total: 1,
};

export const adminUsersListFixture: AdminUserListResponse = {
    items: [adminUserFixture],
    total: 1,
};

// ---------- admin user trips ----------

export const adminUserTripsWire = {
    items: [
        {
            id: 't1',
            name: 'Japan trip',
            start_date: '2026-05-01',
            end_date: '2026-05-10',
            created_at: '2026-01-01T00:00:00Z',
        },
    ],
};

export const adminUserTripsFixture: AdminUserTripsResponse = {
    items: [
        {
            id: 't1',
            name: 'Japan trip',
            startDate: '2026-05-01',
            endDate: '2026-05-10',
            createdAt: '2026-01-01T00:00:00Z',
        },
    ],
};

// ---------- cache management ----------

export const countryCacheWire = {
    code: 'JP',
    name: 'Japan',
    details_cached: true,
    details_hits: 12,
    details_updated_at: '2026-07-01T00:00:00Z',
    has_hero_image: true,
};

export const countryCacheFixture: CountryCacheStatus = {
    code: 'JP',
    name: 'Japan',
    detailsCached: true,
    detailsHits: 12,
    detailsUpdatedAt: '2026-07-01T00:00:00Z',
    hasHeroImage: true,
};

export const cityCacheWire = {
    slug: 'kyoto-jp',
    city_name: 'Kyoto',
    country_name: 'Japan',
    country_code: 'JP',
    details_cached: true,
    details_hits: 5,
    details_updated_at: null,
};

export const cityCacheFixture: CityCacheStatus = {
    slug: 'kyoto-jp',
    cityName: 'Kyoto',
    countryName: 'Japan',
    countryCode: 'JP',
    detailsCached: true,
    detailsHits: 5,
    detailsUpdatedAt: null,
};

export const cacheClearWire = {
    cleared: true,
    rows_deleted: 3,
};

export const cacheClearFixture: CacheClearResult = {
    cleared: true,
    rowsDeleted: 3,
};

export const essentialAppsWire = {
    code: 'JP',
    name: 'Japan',
    source: 'ai',
    cached: true,
    hits: 4,
    updated_at: '2026-07-01T00:00:00Z',
    categories: {
        navigation: [{ name: 'Google Maps', note: 'Offline maps', status: 'ok' }],
    },
};

export const essentialAppsFixture: EssentialAppsCacheStatus = {
    code: 'JP',
    name: 'Japan',
    source: 'ai',
    cached: true,
    hits: 4,
    updatedAt: '2026-07-01T00:00:00Z',
    categories: {
        navigation: [{ name: 'Google Maps', note: 'Offline maps', status: 'ok' }],
    },
};
