/** Response shapes for the `/admin/...` endpoints. Wire format is
 *  snake_case; the API module normalizes to the camelCase types below. */
import type { SubscriptionPlan, SubscriptionStatus, UserRole } from 'types';

export interface RecentSignup {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    subscriptionPlan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    createdAt: string;
}

export interface DashboardOverview {
    totalUsers: number;
    signupsLast7Days: number;
    signupsLast30Days: number;
    paidMembers: number;
    freeUsers: number;
    adminCount: number;
    recentSignups: RecentSignup[];
}

export interface CountByKey {
    /** Raw column value — e.g. `'free'`, `'trialing'`. The dashboard
     *  decides the display label, so the type stays a plain string and
     *  the frontend doesn't have to be re-published every time the
     *  backend adds a new plan/status value. */
    key: string;
    count: number;
}

export interface SubscriptionStats {
    byPlan: CountByKey[];
    byStatus: CountByKey[];
    activeTrials: number;
    cancellingAtPeriodEnd: number;
}

export interface TopCountry {
    countryId: string;
    countryName: string;
    countryCode: string;
    searchClicks: number;
}

export interface TopSavedPlace {
    placeKey: string;
    placeName: string;
    placeCity: string;
    placeCountry: string;
    uniqueSavers: number;
}

export interface ActivityStats {
    totalTrips: number;
    totalReviews: number;
    searchEventsLast30Days: number;
    totalSearchEvents: number;
    topCountries: TopCountry[];
    topSavedPlaces: TopSavedPlace[];
}

export interface MonthlyCountPoint {
    /** `YYYY-MM` — lexicographically sortable. */
    month: string;
    count: number;
}

export interface GrowthResponse {
    months: MonthlyCountPoint[];
}

export interface AiUsagePoint {
    month: string;
    totalSearches: number;
    /** Cache misses — searches that actually hit OpenAI. */
    aiCalls: number;
    cacheHits: number;
    estimatedCostUsd: number;
}

export interface AiUsageResponse {
    months: AiUsagePoint[];
    totalAiCalls: number;
    totalCacheHits: number;
    totalEstimatedCostUsd: number;
    /** Per-call rate the backend used for the cost estimate. Surfaced so
     *  the FE can show the assumption without hardcoding it. */
    estimatedCostPerCallUsd: number;
}

export interface AgeBucketCount {
    key: string;
    label: string;
    count: number;
}

export interface AgeDistributionResponse {
    buckets: AgeBucketCount[];
    total: number;
}

export interface UsersByGenderItem {
    genderName: string;
    count: number;
}

export interface UsersByGenderResponse {
    total: number;
    buckets: UsersByGenderItem[];
}

export type SubscriberSort =
    | 'recent'
    | 'newest_signup'
    | 'email'
    | 'period_end';

export interface SubscriberItem {
    id: string;
    email: string;
    name: string | null;
    subscriptionPlan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    subscriptionCancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    updatedAt: string;
    createdAt: string;
}

export interface SubscribersResponse {
    items: SubscriberItem[];
    total: number;
    page: number;
    perPage: number;
}

export interface TopSearchItem {
    query: string;
    count: number;
}

export interface TopSearchesResponse {
    items: TopSearchItem[];
    total: number;
    page: number;
    perPage: number;
}

export interface PostHogTopEvent {
    event: string;
    count: number;
}

export interface PostHogDailyPoint {
    /** ISO date `YYYY-MM-DD`. */
    day: string;
    count: number;
}

export interface PostHogStatsResponse {
    /** False when the server doesn't have a personal API key + project
     *  id configured. FE renders a setup prompt instead of empty
     *  charts in that case. */
    configured: boolean;
    windowDays: number;
    totalEvents: number;
    uniqueUsers: number;
    topEvents: PostHogTopEvent[];
    dailyEvents: PostHogDailyPoint[];
}

export interface AdminUser {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    subscriptionPlan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    isPaidMember: boolean;
    subscriptionCancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    tripCount: number;
    createdAt: string;
}

export interface AdminUserListResponse {
    items: AdminUser[];
    total: number;
}

export interface AdminUserTrip {
    id: string;
    name: string | null;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
}

export interface AdminUserTripsResponse {
    items: AdminUserTrip[];
}
