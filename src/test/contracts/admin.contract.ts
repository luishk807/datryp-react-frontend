import { z } from 'zod';

/**
 * Zod CONTRACTS for the `/admin/...` REST boundary (app/routers/admin*.py).
 * The client (`adminApi.ts`) reshapes each snake_case wire payload into the
 * camelCase FE types, so these contracts pin the shape the FRONTEND consumes —
 * a renamed / dropped / retyped wire field surfaces here as a missing /
 * wrong-typed camelCase field after the `to*` mappers run.
 *
 * `.strict()` throughout — an unexpected extra field OR a missing one fails the
 * contract, so backend drift is caught in CI instead of a runtime `undefined`.
 * Update a schema here together with its FE interface when a payload
 * intentionally changes. `role` / `subscriptionPlan` / `subscriptionStatus`
 * stay `z.string()` on purpose (the API module only casts, never validates the
 * enum) so a new backend plan/status value doesn't fail the wire contract.
 */

const CountByKeyContract = z
    .object({ key: z.string(), count: z.number() })
    .strict();

// ---------- dashboard tiles ----------

export const RecentSignupContract = z
    .object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable(),
        role: z.string(),
        subscriptionPlan: z.string(),
        subscriptionStatus: z.string(),
        createdAt: z.string(),
    })
    .strict();

export const DashboardOverviewContract = z
    .object({
        totalUsers: z.number(),
        signupsLast7Days: z.number(),
        signupsLast30Days: z.number(),
        paidMembers: z.number(),
        freeUsers: z.number(),
        adminCount: z.number(),
        recentSignups: z.array(RecentSignupContract),
    })
    .strict();

export const SubscriptionStatsContract = z
    .object({
        byPlan: z.array(CountByKeyContract),
        byStatus: z.array(CountByKeyContract),
        activeTrials: z.number(),
        cancellingAtPeriodEnd: z.number(),
    })
    .strict();

export const GrowthResponseContract = z
    .object({
        months: z.array(
            z.object({ month: z.string(), count: z.number() }).strict()
        ),
    })
    .strict();

export const AgeDistributionResponseContract = z
    .object({
        buckets: z.array(
            z
                .object({
                    key: z.string(),
                    label: z.string(),
                    count: z.number(),
                })
                .strict()
        ),
        total: z.number(),
    })
    .strict();

export const UsersByGenderResponseContract = z
    .object({
        total: z.number(),
        buckets: z.array(
            z
                .object({ genderName: z.string(), count: z.number() })
                .strict()
        ),
    })
    .strict();

export const SubscriberItemContract = z
    .object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable(),
        subscriptionPlan: z.string(),
        subscriptionStatus: z.string(),
        subscriptionCancelAtPeriodEnd: z.boolean(),
        currentPeriodEnd: z.string().nullable(),
        trialEndsAt: z.string().nullable(),
        updatedAt: z.string(),
        createdAt: z.string(),
    })
    .strict();

export const SubscribersResponseContract = z
    .object({
        items: z.array(SubscriberItemContract),
        total: z.number(),
        page: z.number(),
        perPage: z.number(),
    })
    .strict();

export const TopSearchesResponseContract = z
    .object({
        items: z.array(
            z.object({ query: z.string(), count: z.number() }).strict()
        ),
        total: z.number(),
        page: z.number(),
        perPage: z.number(),
    })
    .strict();

export const PostHogStatsResponseContract = z
    .object({
        configured: z.boolean(),
        windowDays: z.number(),
        totalEvents: z.number(),
        uniqueUsers: z.number(),
        topEvents: z.array(
            z.object({ event: z.string(), count: z.number() }).strict()
        ),
        dailyEvents: z.array(
            z.object({ day: z.string(), count: z.number() }).strict()
        ),
    })
    .strict();

export const AiUsageResponseContract = z
    .object({
        months: z.array(
            z
                .object({
                    month: z.string(),
                    totalSearches: z.number(),
                    aiCalls: z.number(),
                    cacheHits: z.number(),
                    estimatedCostUsd: z.number(),
                })
                .strict()
        ),
        totalAiCalls: z.number(),
        totalCacheHits: z.number(),
        totalEstimatedCostUsd: z.number(),
        estimatedCostPerCallUsd: z.number(),
    })
    .strict();

export const CostAnalyticsResponseContract = z
    .object({
        features: z.array(
            z
                .object({
                    feature: z.string(),
                    label: z.string(),
                    openaiCalls: z.number(),
                    callsPerUnit: z.number(),
                    estimatedCostUsd: z.number(),
                    cachedServed: z.number(),
                    tracked: z.boolean(),
                    note: z.string().nullable(),
                })
                .strict()
        ),
        totalOpenaiCalls: z.number(),
        totalEstimatedCostUsd: z.number(),
        totalCachedServed: z.number(),
        estimatedCostPerCallUsd: z.number(),
    })
    .strict();

export const ActivityStatsContract = z
    .object({
        totalTrips: z.number(),
        totalReviews: z.number(),
        searchEventsLast30Days: z.number(),
        totalSearchEvents: z.number(),
        topCountries: z.array(
            z
                .object({
                    countryId: z.string(),
                    countryName: z.string(),
                    countryCode: z.string(),
                    searchClicks: z.number(),
                })
                .strict()
        ),
        topSavedPlaces: z.array(
            z
                .object({
                    placeKey: z.string(),
                    placeName: z.string(),
                    placeCity: z.string(),
                    placeCountry: z.string(),
                    uniqueSavers: z.number(),
                })
                .strict()
        ),
    })
    .strict();

// ---------- users ----------

export const AdminUserContract = z
    .object({
        id: z.string(),
        email: z.string(),
        name: z.string().nullable(),
        role: z.string(),
        subscriptionPlan: z.string(),
        subscriptionStatus: z.string(),
        isPaidMember: z.boolean(),
        subscriptionCancelAtPeriodEnd: z.boolean(),
        currentPeriodEnd: z.string().nullable(),
        trialEndsAt: z.string().nullable(),
        tripCount: z.number(),
        createdAt: z.string(),
    })
    .strict();

export const AdminUserListResponseContract = z
    .object({
        items: z.array(AdminUserContract),
        total: z.number(),
    })
    .strict();

export const AdminUserTripsResponseContract = z
    .object({
        items: z.array(
            z
                .object({
                    id: z.string(),
                    name: z.string().nullable(),
                    startDate: z.string().nullable(),
                    endDate: z.string().nullable(),
                    createdAt: z.string(),
                })
                .strict()
        ),
    })
    .strict();

// ---------- cache management ----------

export const CountryCacheStatusContract = z
    .object({
        code: z.string(),
        name: z.string(),
        detailsCached: z.boolean(),
        detailsHits: z.number(),
        detailsUpdatedAt: z.string().nullable(),
        hasHeroImage: z.boolean(),
    })
    .strict();

export const CityCacheStatusContract = z
    .object({
        slug: z.string(),
        cityName: z.string(),
        countryName: z.string(),
        countryCode: z.string(),
        detailsCached: z.boolean(),
        detailsHits: z.number(),
        detailsUpdatedAt: z.string().nullable(),
    })
    .strict();

export const CacheClearResultContract = z
    .object({
        cleared: z.boolean(),
        rowsDeleted: z.number(),
    })
    .strict();

const EssentialAppsCacheAppContract = z
    .object({
        name: z.string(),
        note: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
    })
    .strict();

export const EssentialAppsCacheStatusContract = z
    .object({
        code: z.string(),
        name: z.string(),
        // `to*` mapper collapses any unknown wire value to 'none'.
        source: z.enum(['curated', 'ai', 'none']),
        cached: z.boolean(),
        hits: z.number(),
        updatedAt: z.string().nullable(),
        categories: z
            .record(z.array(EssentialAppsCacheAppContract))
            .nullable(),
    })
    .strict();
