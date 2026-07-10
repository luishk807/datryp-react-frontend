import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    overviewWire,
    overviewFixture,
    usersByGenderWire,
    usersByGenderFixture,
    subscribersWire,
    subscribersFixture,
    topSearchesWire,
    topSearchesFixture,
    postHogWire,
    postHogFixture,
    subscriptionStatsWire,
    subscriptionStatsFixture,
    activityStatsWire,
    activityStatsFixture,
    growthFixture,
    ageDistributionFixture,
    aiUsageWire,
    aiUsageFixture,
    costAnalyticsWire,
    costAnalyticsFixture,
    adminUsersListWire,
    adminUsersListFixture,
    adminUserTripsWire,
    adminUserTripsFixture,
    adminUserWire,
    adminUserFixture,
    countryCacheWire,
    countryCacheFixture,
    cityCacheWire,
    cityCacheFixture,
    essentialAppsWire,
    essentialAppsFixture,
    cacheClearWire,
    cacheClearFixture,
} from '../../test/fixtures/admin';
import { freeEverythingActiveFixture } from '../../test/fixtures/adminSettings';
import {
    adminKeys,
    useAdminOverview,
    useAdminUsersByGender,
    useAdminSubscribers,
    useAdminTopSearches,
    useAdminPosthogStats,
    useAdminSubscriptionStats,
    useAdminActivityStats,
    useAdminGrowth,
    useAdminSubscriptionGrowth,
    useAdminAgeDistribution,
    useAdminAiUsage,
    useAdminCostAnalytics,
    useAdminUsers,
    useAdminUserTrips,
    useCountryCacheStatus,
    useCityCacheStatus,
    useEssentialAppsCacheStatus,
    useFreeEverything,
    useSetUserRole,
    useSetUserPro,
    useSetUserFree,
    useSoftDeleteUser,
    useCreateAdminUser,
    useClearCountryCache,
    useClearCityCache,
    useClearEssentialAppsCache,
    useUpdateFreeEverything,
} from './useAdmin';

const BASE = 'http://localhost:8000';

// `useUser` is mocked so tests can flip between admin (queries enabled) and
// non-admin (queries idle) without a real UserProvider.
let mockUser: { id: string } | null = { id: 'u1' };
let mockIsAdmin = true;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

beforeEach(() => {
    mockUser = { id: 'u1' };
    mockIsAdmin = true;
});

describe('useAdmin dashboard queries', () => {
    it('useAdminOverview fetches + reshapes when admin', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/overview`, () =>
                HttpResponse.json(overviewWire)
            )
        );
        const { result } = renderHookWithProviders(() => useAdminOverview());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(overviewFixture);
    });

    it('useAdminOverview is idle (no request) for a non-admin', () => {
        mockIsAdmin = false;
        const { result } = renderHookWithProviders(() => useAdminOverview());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('useAdminOverview surfaces an error when the backend fails', async () => {
        server.use(
            http.get(
                `${BASE}/admin/dashboard/overview`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useAdminOverview());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('useAdminUsersByGender reshapes buckets', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/users-by-gender`, () =>
                HttpResponse.json(usersByGenderWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAdminUsersByGender()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(usersByGenderFixture);
    });

    it('useAdminSubscribers forwards paging params + reshapes', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(`${BASE}/admin/dashboard/subscribers`, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(subscribersWire);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useAdminSubscribers({ sort: 'recent', page: 1, perPage: 20 })
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('sort')).toBe('recent');
        expect(params!.get('page')).toBe('1');
        expect(params!.get('per_page')).toBe('20');
        expect(result.current.data).toEqual(subscribersFixture);
    });

    it('useAdminTopSearches reshapes the page', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/top-searches`, () =>
                HttpResponse.json(topSearchesWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAdminTopSearches({})
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(topSearchesFixture);
    });

    it('useAdminPosthogStats reshapes stats', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/posthog`, () =>
                HttpResponse.json(postHogWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAdminPosthogStats(30)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(postHogFixture);
    });

    it('useAdminSubscriptionStats reshapes plan/status breakdowns', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/subscription`, () =>
                HttpResponse.json(subscriptionStatsWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAdminSubscriptionStats()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(subscriptionStatsFixture);
    });

    it('useAdminActivityStats reshapes activity rollups', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/activity`, () =>
                HttpResponse.json(activityStatsWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAdminActivityStats()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(activityStatsFixture);
    });

    it('useAdminGrowth passes months + returns the series', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(`${BASE}/admin/dashboard/growth`, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(growthFixture);
            })
        );
        const { result } = renderHookWithProviders(() => useAdminGrowth(6));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('months')).toBe('6');
        expect(result.current.data).toEqual(growthFixture);
    });

    it('useAdminSubscriptionGrowth returns the series', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/subscription-growth`, () =>
                HttpResponse.json(growthFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAdminSubscriptionGrowth()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(growthFixture);
    });

    it('useAdminAgeDistribution passes the payload through', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/age-distribution`, () =>
                HttpResponse.json(ageDistributionFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAdminAgeDistribution()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(ageDistributionFixture);
    });

    it('useAdminAiUsage reshapes usage months', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/ai-usage`, () =>
                HttpResponse.json(aiUsageWire)
            )
        );
        const { result } = renderHookWithProviders(() => useAdminAiUsage());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(aiUsageFixture);
    });

    it('useAdminCostAnalytics reshapes feature rows', async () => {
        server.use(
            http.get(`${BASE}/admin/dashboard/cost-analytics`, () =>
                HttpResponse.json(costAnalyticsWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useAdminCostAnalytics()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(costAnalyticsFixture);
    });
});

describe('useAdmin user queries', () => {
    it('useAdminUsers forwards the search query + reshapes', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(`${BASE}/admin/users`, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(adminUsersListWire);
            })
        );
        const { result } = renderHookWithProviders(() => useAdminUsers('al'));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('q')).toBe('al');
        expect(params!.get('limit')).toBe('50');
        expect(result.current.data).toEqual(adminUsersListFixture);
    });

    it('useAdminUserTrips is enabled only with an id', async () => {
        server.use(
            http.get(`${BASE}/admin/users/:id/trips`, () =>
                HttpResponse.json(adminUserTripsWire)
            )
        );
        const disabled = renderHookWithProviders(() =>
            useAdminUserTrips(null)
        );
        expect(disabled.result.current.fetchStatus).toBe('idle');

        const { result } = renderHookWithProviders(() =>
            useAdminUserTrips('u1')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(adminUserTripsFixture);
    });
});

describe('useAdmin cache-status queries', () => {
    it('useCountryCacheStatus reshapes when a code is given', async () => {
        server.use(
            http.get(`${BASE}/admin/cache/country/:code`, () =>
                HttpResponse.json(countryCacheWire)
            )
        );
        const disabled = renderHookWithProviders(() =>
            useCountryCacheStatus(null)
        );
        expect(disabled.result.current.fetchStatus).toBe('idle');

        const { result } = renderHookWithProviders(() =>
            useCountryCacheStatus('JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(countryCacheFixture);
    });

    it('useCityCacheStatus is enabled only with name + code', async () => {
        server.use(
            http.get(`${BASE}/admin/cache/city`, () =>
                HttpResponse.json(cityCacheWire)
            )
        );
        const disabled = renderHookWithProviders(() =>
            useCityCacheStatus('Kyoto', null)
        );
        expect(disabled.result.current.fetchStatus).toBe('idle');

        const { result } = renderHookWithProviders(() =>
            useCityCacheStatus('Kyoto', 'JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(cityCacheFixture);
    });

    it('useEssentialAppsCacheStatus reshapes when a code is given', async () => {
        server.use(
            http.get(`${BASE}/admin/cache/essential-apps/:code`, () =>
                HttpResponse.json(essentialAppsWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useEssentialAppsCacheStatus('JP')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(essentialAppsFixture);
    });
});

describe('useFreeEverything', () => {
    it('reads the current toggle state when admin', async () => {
        server.use(
            http.get(`${BASE}/admin/settings/free-everything`, () =>
                HttpResponse.json(freeEverythingActiveFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useFreeEverything());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            active: true,
            until: '2026-12-31T23:59:59Z',
        });
    });

    it('is idle for a non-admin', () => {
        mockIsAdmin = false;
        const { result } = renderHookWithProviders(() => useFreeEverything());
        expect(result.current.fetchStatus).toBe('idle');
    });
});

describe('useAdmin user mutations', () => {
    it('useSetUserRole PATCHes + invalidates user data', async () => {
        server.use(
            http.patch(`${BASE}/admin/users/:id/role`, () =>
                HttpResponse.json(adminUserWire)
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useSetUserRole(), {
            client,
        });
        await act(async () => {
            await result.current.mutateAsync({ id: 'u1', role: 'admin' });
        });
        await waitFor(() =>
            expect(result.current.data).toMatchObject(adminUserFixture)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['admin', 'users'],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: adminKeys.overview,
        });
    });

    it('useSetUserPro POSTs to the pro endpoint', async () => {
        let path = '';
        server.use(
            http.post(
                `${BASE}/admin/users/:id/subscription/pro`,
                ({ request }) => {
                    path = new URL(request.url).pathname;
                    return HttpResponse.json(adminUserWire);
                }
            )
        );
        const { result } = renderHookWithProviders(() => useSetUserPro());
        await act(async () => {
            await result.current.mutateAsync('u1');
        });
        expect(path).toBe('/admin/users/u1/subscription/pro');
    });

    it('useSetUserFree POSTs to the free endpoint', async () => {
        let path = '';
        server.use(
            http.post(
                `${BASE}/admin/users/:id/subscription/free`,
                ({ request }) => {
                    path = new URL(request.url).pathname;
                    return HttpResponse.json(adminUserWire);
                }
            )
        );
        const { result } = renderHookWithProviders(() => useSetUserFree());
        await act(async () => {
            await result.current.mutateAsync('u1');
        });
        expect(path).toBe('/admin/users/u1/subscription/free');
    });

    it('useSoftDeleteUser DELETEs + invalidates user data', async () => {
        server.use(
            http.delete(
                `${BASE}/admin/users/:id`,
                () => new HttpResponse(null, { status: 204 })
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useSoftDeleteUser(), {
            client,
        });
        await act(async () => {
            await result.current.mutateAsync('u1');
        });
        await waitFor(() =>
            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: ['admin', 'users'],
            })
        );
    });

    it('useCreateAdminUser POSTs the payload + reshapes', async () => {
        let body: unknown;
        server.use(
            http.post(`${BASE}/admin/users`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(adminUserWire);
            })
        );
        const { result } = renderHookWithProviders(() => useCreateAdminUser());
        await act(async () => {
            await result.current.mutateAsync({
                email: 'new@example.com',
                password: 'secret',
                role: 'admin',
            });
        });
        await waitFor(() =>
            expect(result.current.data).toMatchObject(adminUserFixture)
        );
        expect(body).toMatchObject({ email: 'new@example.com', role: 'admin' });
    });
});

describe('useAdmin cache mutations', () => {
    it('useClearCountryCache DELETEs + invalidates that country', async () => {
        server.use(
            http.delete(`${BASE}/admin/cache/country/:code`, () =>
                HttpResponse.json(cacheClearWire)
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useClearCountryCache(),
            { client }
        );
        await act(async () => {
            await result.current.mutateAsync({ code: 'JP', includeImage: true });
        });
        await waitFor(() =>
            expect(result.current.data).toEqual(cacheClearFixture)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: adminKeys.countryCache('JP'),
        });
    });

    it('useClearCityCache DELETEs + invalidates that city', async () => {
        server.use(
            http.delete(`${BASE}/admin/cache/city`, () =>
                HttpResponse.json(cacheClearWire)
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useClearCityCache(), {
            client,
        });
        await act(async () => {
            await result.current.mutateAsync({ name: 'Kyoto', code: 'JP' });
        });
        await waitFor(() =>
            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: adminKeys.cityCache('Kyoto', 'JP'),
            })
        );
    });

    it('useClearEssentialAppsCache DELETEs + invalidates that country', async () => {
        server.use(
            http.delete(`${BASE}/admin/cache/essential-apps/:code`, () =>
                HttpResponse.json(cacheClearWire)
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useClearEssentialAppsCache(),
            { client }
        );
        await act(async () => {
            await result.current.mutateAsync({ code: 'JP' });
        });
        await waitFor(() =>
            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: adminKeys.essentialAppsCache('JP'),
            })
        );
    });
});

describe('useUpdateFreeEverything', () => {
    it('POSTs, writes the toggle cache, and invalidates /me', async () => {
        let body: unknown;
        server.use(
            http.post(
                `${BASE}/admin/settings/free-everything`,
                async ({ request }) => {
                    body = await request.json();
                    return HttpResponse.json(freeEverythingActiveFixture);
                }
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useUpdateFreeEverything(),
            { client }
        );
        await act(async () => {
            await result.current.mutateAsync({
                enabled: true,
                durationHours: 24,
            });
        });
        expect(body).toEqual({ enabled: true, duration_hours: 24 });
        // onSuccess side effects land a tick after mutateAsync resolves (v5).
        await waitFor(() =>
            expect(client.getQueryData(adminKeys.freeEverything)).toEqual({
                active: true,
                until: '2026-12-31T23:59:59Z',
            })
        );
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['me'] });
    });
});
