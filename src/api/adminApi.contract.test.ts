import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    ActivityStatsContract,
    AdminUserContract,
    AdminUserListResponseContract,
    AdminUserTripsResponseContract,
    AgeDistributionResponseContract,
    AiUsageResponseContract,
    CacheClearResultContract,
    CityCacheStatusContract,
    CostAnalyticsResponseContract,
    CountryCacheStatusContract,
    DashboardOverviewContract,
    EssentialAppsCacheStatusContract,
    GrowthResponseContract,
    PostHogStatsResponseContract,
    SubscribersResponseContract,
    SubscriptionStatsContract,
    TopSearchesResponseContract,
    UsersByGenderResponseContract,
} from '../test/contracts/admin.contract';
import {
    activityStatsFixture,
    activityStatsWire,
    adminUserFixture,
    adminUserWire,
    adminUsersListFixture,
    adminUsersListWire,
    adminUserTripsFixture,
    adminUserTripsWire,
    ageDistributionFixture,
    aiUsageFixture,
    aiUsageWire,
    cacheClearFixture,
    cacheClearWire,
    cityCacheFixture,
    cityCacheWire,
    costAnalyticsFixture,
    costAnalyticsWire,
    countryCacheFixture,
    countryCacheWire,
    essentialAppsFixture,
    essentialAppsWire,
    growthFixture,
    overviewFixture,
    overviewWire,
    postHogFixture,
    postHogWire,
    subscribersFixture,
    subscribersWire,
    subscriptionStatsFixture,
    subscriptionStatsWire,
    topSearchesFixture,
    topSearchesWire,
    usersByGenderFixture,
    usersByGenderWire,
} from '../test/fixtures/admin';
import {
    clearCityCache,
    clearCountryCache,
    clearEssentialAppsCache,
    createAdminUser,
    fetchActivityStats,
    fetchAdminUsers,
    fetchAdminUserTrips,
    fetchAgeDistribution,
    fetchAiUsage,
    fetchCityCacheStatus,
    fetchCostAnalytics,
    fetchCountryCacheStatus,
    fetchEssentialAppsCacheStatus,
    fetchGrowth,
    fetchOverview,
    fetchPostHogStats,
    fetchSubscribers,
    fetchSubscriptionGrowth,
    fetchSubscriptionStats,
    fetchTopSearches,
    fetchUsersByGender,
    setUserFree,
    setUserPro,
    setUserRole,
    softDeleteUser,
} from './adminApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';

// Register a GET handler that echoes the request URL + auth header back to the
// test and returns `body` with `status`. Returned object is filled in when the
// client actually issues the request.
const onGet = (url: string, body: unknown, status = 200) => {
    const captured: { url: string; auth: string | null } = {
        url: '',
        auth: null,
    };
    server.use(
        http.get(url, ({ request }) => {
            captured.url = request.url;
            captured.auth = request.headers.get('authorization');
            return HttpResponse.json(body, { status });
        })
    );
    return captured;
};

// Contract tests for the admin REST boundary: drive the REAL client functions
// through MSW so request-building (query params, bodies, auth) and the
// snake→camel `to*` reshaping are exercised, then validate the returned
// payloads against the Zod contracts.
describe('adminApi contract', () => {
    beforeEach(() => setAuthToken('test-token'));

    // ---------- dashboard tiles ----------

    describe('GET /admin/dashboard/overview', () => {
        it('reshapes the payload and satisfies the contract', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/overview`,
                overviewWire
            );
            const res = await fetchOverview();
            expect(() => DashboardOverviewContract.parse(res)).not.toThrow();
            expect(res).toEqual(overviewFixture);
            expect(cap.auth).toBe('Bearer test-token');
        });

        it('omits the Authorization header when no token is stored', async () => {
            setAuthToken(null);
            const cap = onGet(
                `${API_BASE}/admin/dashboard/overview`,
                overviewWire
            );
            await fetchOverview();
            expect(cap.auth).toBeNull();
        });

        it('throws with the backend detail on a non-OK response', async () => {
            onGet(`${API_BASE}/admin/dashboard/overview`, { detail: 'boom' }, 500);
            await expect(fetchOverview()).rejects.toThrow(/overview.*boom/);
        });
    });

    describe('GET /admin/dashboard/subscription', () => {
        it('reshapes and satisfies the contract', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/subscription`,
                subscriptionStatsWire
            );
            const res = await fetchSubscriptionStats();
            expect(() => SubscriptionStatsContract.parse(res)).not.toThrow();
            expect(res).toEqual(subscriptionStatsFixture);
        });

        it('throws with status only when the error body is not JSON', async () => {
            server.use(
                http.get(
                    `${API_BASE}/admin/dashboard/subscription`,
                    () => new HttpResponse('nope', { status: 503 })
                )
            );
            await expect(fetchSubscriptionStats()).rejects.toThrow(/503/);
        });
    });

    describe('GET /admin/dashboard/growth', () => {
        it('defaults months=12 and passes months through', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/growth`,
                growthFixture
            );
            const res = await fetchGrowth();
            expect(() => GrowthResponseContract.parse(res)).not.toThrow();
            expect(res).toEqual(growthFixture);
            expect(new URL(cap.url).searchParams.get('months')).toBe('12');
        });

        it('forwards an explicit months value', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/growth`,
                growthFixture
            );
            await fetchGrowth(6);
            expect(new URL(cap.url).searchParams.get('months')).toBe('6');
        });

        it('throws on a non-OK response', async () => {
            onGet(`${API_BASE}/admin/dashboard/growth`, { detail: 'x' }, 500);
            await expect(fetchGrowth()).rejects.toThrow(/growth/);
        });
    });

    describe('GET /admin/dashboard/subscription-growth', () => {
        it('defaults months=12 and passes months through', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/subscription-growth`,
                growthFixture
            );
            const res = await fetchSubscriptionGrowth();
            expect(() => GrowthResponseContract.parse(res)).not.toThrow();
            expect(new URL(cap.url).searchParams.get('months')).toBe('12');
        });

        it('forwards an explicit months value', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/subscription-growth`,
                growthFixture
            );
            await fetchSubscriptionGrowth(3);
            expect(new URL(cap.url).searchParams.get('months')).toBe('3');
        });

        it('throws on a non-OK response', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/subscription-growth`,
                { detail: 'x' },
                500
            );
            await expect(fetchSubscriptionGrowth()).rejects.toThrow(
                /subscription-growth/
            );
        });
    });

    describe('GET /admin/dashboard/age-distribution', () => {
        it('passes the payload through and satisfies the contract', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/age-distribution`,
                ageDistributionFixture
            );
            const res = await fetchAgeDistribution();
            expect(() =>
                AgeDistributionResponseContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual(ageDistributionFixture);
        });

        it('throws on a non-OK response', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/age-distribution`,
                { detail: 'x' },
                500
            );
            await expect(fetchAgeDistribution()).rejects.toThrow(
                /age-distribution/
            );
        });
    });

    describe('GET /admin/dashboard/users-by-gender', () => {
        it('reshapes gender_name→genderName and satisfies the contract', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/users-by-gender`,
                usersByGenderWire
            );
            const res = await fetchUsersByGender();
            expect(() =>
                UsersByGenderResponseContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual(usersByGenderFixture);
        });

        it('throws on a non-OK response', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/users-by-gender`,
                { detail: 'x' },
                500
            );
            await expect(fetchUsersByGender()).rejects.toThrow(
                /users-by-gender/
            );
        });
    });

    describe('GET /admin/dashboard/subscribers', () => {
        it('defaults sort/page/per_page and reshapes items', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/subscribers`,
                subscribersWire
            );
            const res = await fetchSubscribers({});
            expect(() => SubscribersResponseContract.parse(res)).not.toThrow();
            expect(res).toEqual(subscribersFixture);
            const q = new URL(cap.url).searchParams;
            expect(q.get('sort')).toBe('recent');
            expect(q.get('page')).toBe('1');
            expect(q.get('per_page')).toBe('20');
        });

        it('forwards explicit sort/page/perPage as query params', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/subscribers`,
                subscribersWire
            );
            await fetchSubscribers({ sort: 'email', page: 3, perPage: 50 });
            const q = new URL(cap.url).searchParams;
            expect(q.get('sort')).toBe('email');
            expect(q.get('page')).toBe('3');
            expect(q.get('per_page')).toBe('50');
        });

        it('throws on a non-OK response', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/subscribers`,
                { detail: 'x' },
                500
            );
            await expect(fetchSubscribers({})).rejects.toThrow(/subscribers/);
        });
    });

    describe('GET /admin/dashboard/top-searches', () => {
        it('defaults page/per_page/days and passes items through', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/top-searches`,
                topSearchesWire
            );
            const res = await fetchTopSearches({});
            expect(() => TopSearchesResponseContract.parse(res)).not.toThrow();
            expect(res).toEqual(topSearchesFixture);
            const q = new URL(cap.url).searchParams;
            expect(q.get('page')).toBe('1');
            expect(q.get('per_page')).toBe('20');
            expect(q.get('days')).toBe('0');
        });

        it('forwards explicit page/perPage/days', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/top-searches`,
                topSearchesWire
            );
            await fetchTopSearches({ page: 2, perPage: 10, days: 7 });
            const q = new URL(cap.url).searchParams;
            expect(q.get('page')).toBe('2');
            expect(q.get('per_page')).toBe('10');
            expect(q.get('days')).toBe('7');
        });

        it('throws on a non-OK response', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/top-searches`,
                { detail: 'x' },
                500
            );
            await expect(fetchTopSearches({})).rejects.toThrow(/top-searches/);
        });
    });

    describe('GET /admin/dashboard/posthog', () => {
        it('defaults days=30 and reshapes window_days→windowDays', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/posthog`,
                postHogWire
            );
            const res = await fetchPostHogStats();
            expect(() =>
                PostHogStatsResponseContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual(postHogFixture);
            expect(new URL(cap.url).searchParams.get('days')).toBe('30');
        });

        it('forwards an explicit days value', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/posthog`,
                postHogWire
            );
            await fetchPostHogStats(90);
            expect(new URL(cap.url).searchParams.get('days')).toBe('90');
        });

        it('throws on a non-OK response', async () => {
            onGet(`${API_BASE}/admin/dashboard/posthog`, { detail: 'x' }, 500);
            await expect(fetchPostHogStats()).rejects.toThrow(/posthog/);
        });
    });

    describe('GET /admin/dashboard/ai-usage', () => {
        it('defaults months=12 and reshapes months + totals', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/ai-usage`,
                aiUsageWire
            );
            const res = await fetchAiUsage();
            expect(() => AiUsageResponseContract.parse(res)).not.toThrow();
            expect(res).toEqual(aiUsageFixture);
            expect(new URL(cap.url).searchParams.get('months')).toBe('12');
        });

        it('forwards an explicit months value', async () => {
            const cap = onGet(
                `${API_BASE}/admin/dashboard/ai-usage`,
                aiUsageWire
            );
            await fetchAiUsage(24);
            expect(new URL(cap.url).searchParams.get('months')).toBe('24');
        });

        it('throws on a non-OK response', async () => {
            onGet(`${API_BASE}/admin/dashboard/ai-usage`, { detail: 'x' }, 500);
            await expect(fetchAiUsage()).rejects.toThrow(/ai-usage/);
        });
    });

    describe('GET /admin/dashboard/cost-analytics', () => {
        it('reshapes features + totals and satisfies the contract', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/cost-analytics`,
                costAnalyticsWire
            );
            const res = await fetchCostAnalytics();
            expect(() =>
                CostAnalyticsResponseContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual(costAnalyticsFixture);
        });

        it('throws on a non-OK response', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/cost-analytics`,
                { detail: 'x' },
                500
            );
            await expect(fetchCostAnalytics()).rejects.toThrow(
                /cost-analytics/
            );
        });
    });

    describe('GET /admin/dashboard/activity', () => {
        it('reshapes nested lists and satisfies the contract', async () => {
            onGet(`${API_BASE}/admin/dashboard/activity`, activityStatsWire);
            const res = await fetchActivityStats();
            expect(() => ActivityStatsContract.parse(res)).not.toThrow();
            expect(res).toEqual(activityStatsFixture);
        });

        it('throws on a non-OK response', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/activity`,
                { detail: 'x' },
                500
            );
            await expect(fetchActivityStats()).rejects.toThrow(/activity/);
        });
    });

    // ---------- users ----------

    describe('POST /admin/users (createAdminUser)', () => {
        it('sends the full snake_case body and returns a contract user', async () => {
            let body: Record<string, unknown> = {};
            let contentType: string | null = null;
            let auth: string | null = null;
            server.use(
                http.post(`${API_BASE}/admin/users`, async ({ request }) => {
                    body = (await request.json()) as Record<string, unknown>;
                    contentType = request.headers.get('content-type');
                    auth = request.headers.get('authorization');
                    return HttpResponse.json(adminUserWire);
                })
            );
            const res = await createAdminUser({
                email: 'new@example.com',
                password: 'secret',
                name: 'New User',
                birthYear: 1991,
                phone: '+15551234',
                role: 'admin',
            });
            expect(() => AdminUserContract.parse(res)).not.toThrow();
            expect(res).toEqual(adminUserFixture);
            expect(body).toEqual({
                email: 'new@example.com',
                password: 'secret',
                name: 'New User',
                birth_year: 1991,
                phone: '+15551234',
                role: 'admin',
            });
            expect(contentType).toContain('application/json');
            expect(auth).toBe('Bearer test-token');
        });

        it('nulls optional fields and defaults role to "user"', async () => {
            let body: Record<string, unknown> = {};
            server.use(
                http.post(`${API_BASE}/admin/users`, async ({ request }) => {
                    body = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(adminUserWire);
                })
            );
            await createAdminUser({ email: 'a@b.com', password: 'p' });
            expect(body.name).toBeNull();
            expect(body.birth_year).toBeNull();
            expect(body.phone).toBeNull();
            expect(body.role).toBe('user');
        });

        it('throws with the backend detail on a non-OK response', async () => {
            server.use(
                http.post(`${API_BASE}/admin/users`, () =>
                    HttpResponse.json({ detail: 'dupe email' }, { status: 409 })
                )
            );
            await expect(
                createAdminUser({ email: 'a@b.com', password: 'p' })
            ).rejects.toThrow(/create user.*dupe email/);
        });
    });

    describe('GET /admin/users (fetchAdminUsers)', () => {
        it('sends q + limit and reshapes items', async () => {
            const cap = onGet(`${API_BASE}/admin/users`, adminUsersListWire);
            const res = await fetchAdminUsers('al', 25);
            expect(() =>
                AdminUserListResponseContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual(adminUsersListFixture);
            const q = new URL(cap.url).searchParams;
            expect(q.get('q')).toBe('al');
            expect(q.get('limit')).toBe('25');
        });

        it('omits q when undefined and defaults limit=50', async () => {
            const cap = onGet(`${API_BASE}/admin/users`, adminUsersListWire);
            await fetchAdminUsers(undefined);
            const q = new URL(cap.url).searchParams;
            expect(q.has('q')).toBe(false);
            expect(q.get('limit')).toBe('50');
        });

        it('throws on a non-OK response', async () => {
            onGet(`${API_BASE}/admin/users`, { detail: 'x' }, 500);
            await expect(fetchAdminUsers('al')).rejects.toThrow(/\/admin\/users/);
        });
    });

    describe('GET /admin/users/:id/trips (fetchAdminUserTrips)', () => {
        it('URL-encodes the id and reshapes trips', async () => {
            const cap = onGet(
                `${API_BASE}/admin/users/:id/trips`,
                adminUserTripsWire
            );
            const res = await fetchAdminUserTrips('u/1');
            expect(() =>
                AdminUserTripsResponseContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual(adminUserTripsFixture);
            expect(new URL(cap.url).pathname).toBe('/admin/users/u%2F1/trips');
        });

        it('throws on a non-OK response', async () => {
            onGet(`${API_BASE}/admin/users/:id/trips`, { detail: 'x' }, 500);
            await expect(fetchAdminUserTrips('u1')).rejects.toThrow(/trips/);
        });
    });

    describe('PATCH /admin/users/:id/role (setUserRole)', () => {
        it('sends { role } and returns a contract user', async () => {
            let method: string | undefined;
            let body: unknown;
            let path: string | undefined;
            server.use(
                http.patch(
                    `${API_BASE}/admin/users/:id/role`,
                    async ({ request }) => {
                        method = request.method;
                        body = await request.json();
                        path = new URL(request.url).pathname;
                        return HttpResponse.json(adminUserWire);
                    }
                )
            );
            const res = await setUserRole('u1', 'admin');
            expect(() => AdminUserContract.parse(res)).not.toThrow();
            expect(res).toEqual(adminUserFixture);
            expect(method).toBe('PATCH');
            expect(body).toEqual({ role: 'admin' });
            expect(path).toBe('/admin/users/u1/role');
        });

        it('throws on a non-OK response', async () => {
            server.use(
                http.patch(
                    `${API_BASE}/admin/users/:id/role`,
                    () => new HttpResponse(null, { status: 400 })
                )
            );
            await expect(setUserRole('u1', 'admin')).rejects.toThrow(
                /set role/
            );
        });
    });

    describe('POST /admin/users/:id/subscription/pro (setUserPro)', () => {
        it('issues a POST and returns a contract user', async () => {
            let method: string | undefined;
            let path: string | undefined;
            let auth: string | null = null;
            server.use(
                http.post(
                    `${API_BASE}/admin/users/:id/subscription/pro`,
                    ({ request }) => {
                        method = request.method;
                        path = new URL(request.url).pathname;
                        auth = request.headers.get('authorization');
                        return HttpResponse.json(adminUserWire);
                    }
                )
            );
            const res = await setUserPro('u1');
            expect(() => AdminUserContract.parse(res)).not.toThrow();
            expect(res).toEqual(adminUserFixture);
            expect(method).toBe('POST');
            expect(path).toBe('/admin/users/u1/subscription/pro');
            expect(auth).toBe('Bearer test-token');
        });

        it('throws on a non-OK response', async () => {
            server.use(
                http.post(
                    `${API_BASE}/admin/users/:id/subscription/pro`,
                    () => new HttpResponse(null, { status: 500 })
                )
            );
            await expect(setUserPro('u1')).rejects.toThrow(/set pro/);
        });
    });

    describe('POST /admin/users/:id/subscription/free (setUserFree)', () => {
        it('issues a POST and returns a contract user', async () => {
            let path: string | undefined;
            server.use(
                http.post(
                    `${API_BASE}/admin/users/:id/subscription/free`,
                    ({ request }) => {
                        path = new URL(request.url).pathname;
                        return HttpResponse.json(adminUserWire);
                    }
                )
            );
            const res = await setUserFree('u1');
            expect(() => AdminUserContract.parse(res)).not.toThrow();
            expect(res).toEqual(adminUserFixture);
            expect(path).toBe('/admin/users/u1/subscription/free');
        });

        it('throws on a non-OK response', async () => {
            server.use(
                http.post(
                    `${API_BASE}/admin/users/:id/subscription/free`,
                    () => new HttpResponse(null, { status: 500 })
                )
            );
            await expect(setUserFree('u1')).rejects.toThrow(/set free/);
        });
    });

    describe('DELETE /admin/users/:id (softDeleteUser)', () => {
        it('issues a DELETE and resolves void on 204', async () => {
            let method: string | undefined;
            let path: string | undefined;
            server.use(
                http.delete(
                    `${API_BASE}/admin/users/:id`,
                    ({ request }) => {
                        method = request.method;
                        path = new URL(request.url).pathname;
                        return new HttpResponse(null, { status: 204 });
                    }
                )
            );
            await expect(softDeleteUser('u1')).resolves.toBeUndefined();
            expect(method).toBe('DELETE');
            expect(path).toBe('/admin/users/u1');
        });

        it('throws with the backend detail on a non-OK response', async () => {
            server.use(
                http.delete(`${API_BASE}/admin/users/:id`, () =>
                    HttpResponse.json({ detail: 'last admin' }, { status: 400 })
                )
            );
            await expect(softDeleteUser('u1')).rejects.toThrow(
                /delete user.*last admin/
            );
        });
    });

    // ---------- cache management ----------

    describe('GET /admin/cache/country/:code (fetchCountryCacheStatus)', () => {
        it('URL-encodes the code and reshapes the status', async () => {
            const cap = onGet(
                `${API_BASE}/admin/cache/country/:code`,
                countryCacheWire
            );
            const res = await fetchCountryCacheStatus('JP');
            expect(() =>
                CountryCacheStatusContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual(countryCacheFixture);
            expect(new URL(cap.url).pathname).toBe('/admin/cache/country/JP');
        });

        it('throws on a non-OK response', async () => {
            onGet(`${API_BASE}/admin/cache/country/:code`, { detail: 'x' }, 404);
            await expect(fetchCountryCacheStatus('JP')).rejects.toThrow(
                /cache\/country/
            );
        });
    });

    describe('DELETE /admin/cache/country/:code (clearCountryCache)', () => {
        it('adds include_image=true only when requested and reshapes result', async () => {
            let query: URLSearchParams | null = null;
            server.use(
                http.delete(
                    `${API_BASE}/admin/cache/country/:code`,
                    ({ request }) => {
                        query = new URL(request.url).searchParams;
                        return HttpResponse.json(cacheClearWire);
                    }
                )
            );
            const res = await clearCountryCache('JP', { includeImage: true });
            expect(() => CacheClearResultContract.parse(res)).not.toThrow();
            expect(res).toEqual(cacheClearFixture);
            expect(query!.get('include_image')).toBe('true');
        });

        it('omits include_image when not requested', async () => {
            let query: URLSearchParams | null = null;
            server.use(
                http.delete(
                    `${API_BASE}/admin/cache/country/:code`,
                    ({ request }) => {
                        query = new URL(request.url).searchParams;
                        return HttpResponse.json(cacheClearWire);
                    }
                )
            );
            await clearCountryCache('JP');
            expect(query!.has('include_image')).toBe(false);
        });

        it('throws on a non-OK response', async () => {
            server.use(
                http.delete(
                    `${API_BASE}/admin/cache/country/:code`,
                    () => new HttpResponse(null, { status: 500 })
                )
            );
            await expect(clearCountryCache('JP')).rejects.toThrow(
                /clear country cache/
            );
        });
    });

    describe('GET /admin/cache/city (fetchCityCacheStatus)', () => {
        it('sends name + code and reshapes the status', async () => {
            const cap = onGet(`${API_BASE}/admin/cache/city`, cityCacheWire);
            const res = await fetchCityCacheStatus('Kyoto', 'JP');
            expect(() => CityCacheStatusContract.parse(res)).not.toThrow();
            expect(res).toEqual(cityCacheFixture);
            const q = new URL(cap.url).searchParams;
            expect(q.get('name')).toBe('Kyoto');
            expect(q.get('code')).toBe('JP');
        });

        it('throws on a non-OK response', async () => {
            onGet(`${API_BASE}/admin/cache/city`, { detail: 'x' }, 404);
            await expect(fetchCityCacheStatus('Kyoto', 'JP')).rejects.toThrow(
                /cache\/city/
            );
        });
    });

    describe('DELETE /admin/cache/city (clearCityCache)', () => {
        it('sends name + code and reshapes the result', async () => {
            let query: URLSearchParams | null = null;
            server.use(
                http.delete(
                    `${API_BASE}/admin/cache/city`,
                    ({ request }) => {
                        query = new URL(request.url).searchParams;
                        return HttpResponse.json(cacheClearWire);
                    }
                )
            );
            const res = await clearCityCache('Kyoto', 'JP');
            expect(() => CacheClearResultContract.parse(res)).not.toThrow();
            expect(res).toEqual(cacheClearFixture);
            expect(query!.get('name')).toBe('Kyoto');
            expect(query!.get('code')).toBe('JP');
        });

        it('throws on a non-OK response', async () => {
            server.use(
                http.delete(
                    `${API_BASE}/admin/cache/city`,
                    () => new HttpResponse(null, { status: 500 })
                )
            );
            await expect(clearCityCache('Kyoto', 'JP')).rejects.toThrow(
                /clear city cache/
            );
        });
    });

    describe('GET /admin/cache/essential-apps/:code', () => {
        it('reshapes an "ai" source status and satisfies the contract', async () => {
            const cap = onGet(
                `${API_BASE}/admin/cache/essential-apps/:code`,
                essentialAppsWire
            );
            const res = await fetchEssentialAppsCacheStatus('JP');
            expect(() =>
                EssentialAppsCacheStatusContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual(essentialAppsFixture);
            expect(new URL(cap.url).pathname).toBe(
                '/admin/cache/essential-apps/JP'
            );
        });

        it('keeps a "curated" source', async () => {
            onGet(`${API_BASE}/admin/cache/essential-apps/:code`, {
                ...essentialAppsWire,
                source: 'curated',
            });
            const res = await fetchEssentialAppsCacheStatus('JP');
            expect(res.source).toBe('curated');
        });

        it('collapses an unknown source to "none"', async () => {
            onGet(`${API_BASE}/admin/cache/essential-apps/:code`, {
                ...essentialAppsWire,
                source: 'mystery',
                categories: null,
            });
            const res = await fetchEssentialAppsCacheStatus('JP');
            expect(res.source).toBe('none');
            expect(res.categories).toBeNull();
        });

        it('throws on a non-OK response', async () => {
            onGet(
                `${API_BASE}/admin/cache/essential-apps/:code`,
                { detail: 'x' },
                404
            );
            await expect(
                fetchEssentialAppsCacheStatus('JP')
            ).rejects.toThrow(/essential-apps/);
        });
    });

    describe('DELETE /admin/cache/essential-apps/:code', () => {
        it('issues a DELETE and reshapes the result', async () => {
            let method: string | undefined;
            server.use(
                http.delete(
                    `${API_BASE}/admin/cache/essential-apps/:code`,
                    ({ request }) => {
                        method = request.method;
                        return HttpResponse.json(cacheClearWire);
                    }
                )
            );
            const res = await clearEssentialAppsCache('JP');
            expect(() => CacheClearResultContract.parse(res)).not.toThrow();
            expect(res).toEqual(cacheClearFixture);
            expect(method).toBe('DELETE');
        });

        it('throws on a non-OK response', async () => {
            server.use(
                http.delete(
                    `${API_BASE}/admin/cache/essential-apps/:code`,
                    () => new HttpResponse(null, { status: 500 })
                )
            );
            await expect(clearEssentialAppsCache('JP')).rejects.toThrow(
                /clear essential-apps cache/
            );
        });
    });

    // ---------- handleError branch: non-string detail is ignored ----------

    describe('handleError detail handling', () => {
        it('ignores a non-string detail field', async () => {
            onGet(
                `${API_BASE}/admin/dashboard/overview`,
                { detail: 123 },
                500
            );
            const err = await fetchOverview().catch((e: Error) => e);
            expect(err).toBeInstanceOf(Error);
            expect((err as Error).message).toMatch(/500/);
            expect((err as Error).message).not.toMatch(/123/);
        });
    });

    // ---------- Zod drift guards ----------

    describe('Zod drift guards', () => {
        it('catches a MISSING required field', () => {
            const missing = { ...adminUserFixture } as Record<string, unknown>;
            delete missing.email;
            expect(() => AdminUserContract.parse(missing)).toThrow();
        });

        it('catches an UNEXPECTED extra field (strict shape)', () => {
            expect(() =>
                AdminUserContract.parse({ ...adminUserFixture, surprise: true })
            ).toThrow();
        });

        it('catches a WRONG-typed field (string where number)', () => {
            expect(() =>
                AdminUserContract.parse({
                    ...adminUserFixture,
                    tripCount: 'three',
                })
            ).toThrow();
        });

        it('catches drift in the overview envelope (wrong-typed total)', () => {
            expect(() =>
                DashboardOverviewContract.parse({
                    ...overviewFixture,
                    totalUsers: 'many',
                })
            ).toThrow();
        });

        it('rejects an out-of-vocabulary essential-apps source', () => {
            expect(() =>
                EssentialAppsCacheStatusContract.parse({
                    ...essentialAppsFixture,
                    source: 'weird',
                })
            ).toThrow();
        });
    });
});
