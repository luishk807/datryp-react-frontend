import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    PlaceDetailsContract,
    PlaceDetailsResultContract,
    PlaceFactsSliceContract,
    PlaceListsSliceContract,
    PlaceProseSliceContract,
    PlaceRecommendationContract,
    PlaceRecommendationsResultContract,
} from '../test/contracts/placeRecommendations.contract';
import {
    factsExpected,
    factsWire,
    listsExpected,
    listsWire,
    placeDetailsExpected,
    placeDetailsResponseWire,
    placeDirectResponseWire,
    placeItemWire,
    placeRecommendationFixture,
    proseExpected,
    proseWire,
    recommendationsResponseWire,
} from '../test/fixtures/placeRecommendations';
import {
    fetchPlaceDetails,
    fetchPlaceDirect,
    fetchPlaceFacts,
    fetchPlaceLists,
    fetchPlaceProse,
    fetchPlaceRecommendations,
} from './placeRecommendationsApi';
import { QueryBlockedError } from './moderationError';
import { SearchQuotaExceededError } from './searchQuotaError';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const RECS_URL = `${API_BASE}/place-recommendations`;
const DIRECT_URL = `${API_BASE}/place-direct`;
const DETAILS_URL = `${API_BASE}/place-details`;

// Register a GET handler that captures the request URL + auth header and
// returns `body` with `status`.
const onGet = (url: string, body: unknown, status = 200) => {
    const captured: { url: string; auth: string | null; hasAuth: boolean } = {
        url: '',
        auth: null,
        hasAuth: false,
    };
    server.use(
        http.get(url, ({ request }) => {
            captured.url = request.url;
            captured.auth = request.headers.get('authorization');
            captured.hasAuth = request.headers.has('authorization');
            return HttpResponse.json(body, { status });
        })
    );
    return captured;
};

// Contract tests for the place-recommendation / place-details REST boundary:
// drive the REAL client functions through MSW so query-param building, the
// snake→camel reshaping, and the 402/422 error branches are exercised, then
// validate the returned payloads against the Zod contracts.
describe('placeRecommendationsApi contract', () => {
    beforeEach(() => setAuthToken('test-token'));

    // ---------- GET /place-recommendations ----------

    describe('GET /place-recommendations (fetchPlaceRecommendations)', () => {
        it('reshapes items + extras and satisfies the contract', async () => {
            const cap = onGet(RECS_URL, recommendationsResponseWire);
            const res = await fetchPlaceRecommendations('kyoto');
            expect(() =>
                PlaceRecommendationsResultContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual({
                query: 'kyoto',
                cached: false,
                items: [placeRecommendationFixture],
                summary: 'A one-line overview of the matches.',
                relatedSearches: ['osaka', 'nara'],
            });
            const q = new URL(cap.url).searchParams;
            expect(q.get('q')).toBe('kyoto');
            expect(q.get('limit')).toBe('2'); // default
            expect(q.get('lang')).toBeTruthy();
            expect(q.has('country')).toBe(false);
            expect(q.has('kind')).toBe(false);
            expect(cap.auth).toBe('Bearer test-token');
        });

        it('forwards explicit limit + trimmed country + suggestion kind', async () => {
            const cap = onGet(RECS_URL, recommendationsResponseWire);
            await fetchPlaceRecommendations('kyoto', 5, '  Japan  ', 'suggestion');
            const q = new URL(cap.url).searchParams;
            expect(q.get('limit')).toBe('5');
            expect(q.get('country')).toBe('Japan');
            expect(q.get('kind')).toBe('suggestion');
        });

        it('omits an all-whitespace country param', async () => {
            const cap = onGet(RECS_URL, recommendationsResponseWire);
            await fetchPlaceRecommendations('kyoto', 2, '   ');
            expect(new URL(cap.url).searchParams.has('country')).toBe(false);
        });

        it('omits the Authorization header when no token is stored', async () => {
            setAuthToken(null);
            const cap = onGet(RECS_URL, recommendationsResponseWire);
            await fetchPlaceRecommendations('kyoto');
            expect(cap.hasAuth).toBe(false);
        });

        it('coerces absent summary / related_searches to undefined', async () => {
            onGet(RECS_URL, {
                query: 'kyoto',
                cached: true,
                items: [placeItemWire],
            });
            const res = await fetchPlaceRecommendations('kyoto');
            expect(res.summary).toBeUndefined();
            expect(res.relatedSearches).toBeUndefined();
        });

        it('coerces null country_code / latitude / longitude to null', async () => {
            onGet(RECS_URL, {
                query: 'kyoto',
                cached: true,
                items: [
                    {
                        ...placeItemWire,
                        country_code: null,
                        latitude: null,
                        longitude: null,
                    },
                ],
            });
            const res = await fetchPlaceRecommendations('kyoto');
            expect(() =>
                PlaceRecommendationsResultContract.parse(res)
            ).not.toThrow();
            expect(res.items[0].countryCode).toBeNull();
            expect(res.items[0].latitude).toBeNull();
            expect(res.items[0].longitude).toBeNull();
        });

        it('defaults a blocked 422 with no category to "other"', async () => {
            onGet(RECS_URL, { detail: { blocked: true } }, 422);
            const err = await fetchPlaceRecommendations('x').catch(
                (e: unknown) => e
            );
            expect(err).toBeInstanceOf(QueryBlockedError);
            expect((err as QueryBlockedError).category).toBe('other');
        });

        it('throws QueryBlockedError on a 422 travel-scope block', async () => {
            onGet(
                RECS_URL,
                { detail: { blocked: true, category: 'adult' } },
                422
            );
            const err = await fetchPlaceRecommendations('bad').catch(
                (e: unknown) => e
            );
            expect(err).toBeInstanceOf(QueryBlockedError);
            expect((err as QueryBlockedError).category).toBe('adult');
        });

        it('falls through to a generic error when a 422 is not a block', async () => {
            onGet(RECS_URL, { detail: { blocked: false } }, 422);
            await expect(fetchPlaceRecommendations('x')).rejects.toThrow(
                /place-recommendations failed: 422/
            );
        });

        it('falls through to a generic error when a 422 body is not JSON', async () => {
            server.use(
                http.get(
                    RECS_URL,
                    () => new HttpResponse('boom', { status: 422 })
                )
            );
            await expect(fetchPlaceRecommendations('x')).rejects.toThrow(
                /place-recommendations failed: 422/
            );
        });

        it('throws SearchQuotaExceededError on a 402 quota hit', async () => {
            onGet(
                RECS_URL,
                {
                    detail: {
                        quota_exceeded: true,
                        limit: 5,
                        used: 3,
                        resets_at: '2026-07-11T00:00:00Z',
                    },
                },
                402
            );
            const err = await fetchPlaceRecommendations('x').catch(
                (e: unknown) => e
            );
            expect(err).toBeInstanceOf(SearchQuotaExceededError);
            const quota = err as SearchQuotaExceededError;
            expect(quota.limit).toBe(5);
            expect(quota.used).toBe(3);
            expect(quota.resetsAt).toBe('2026-07-11T00:00:00Z');
        });

        it('defaults quota fields when the 402 body omits them', async () => {
            onGet(RECS_URL, { detail: { quota_exceeded: true } }, 402);
            const err = await fetchPlaceRecommendations('x').catch(
                (e: unknown) => e
            );
            expect(err).toBeInstanceOf(SearchQuotaExceededError);
            const quota = err as SearchQuotaExceededError;
            expect(quota.limit).toBe(5);
            expect(quota.used).toBe(0);
            expect(quota.resetsAt).toBeNull();
        });

        it('falls through to a generic error when a 402 is not a quota hit', async () => {
            onGet(RECS_URL, { detail: { quota_exceeded: false } }, 402);
            await expect(fetchPlaceRecommendations('x')).rejects.toThrow(
                /place-recommendations failed: 402/
            );
        });

        it('throws a generic error on any other non-OK status', async () => {
            onGet(RECS_URL, { detail: 'server error' }, 500);
            await expect(fetchPlaceRecommendations('x')).rejects.toThrow(
                /place-recommendations failed: 500/
            );
        });
    });

    // ---------- GET /place-direct ----------

    describe('GET /place-direct (fetchPlaceDirect)', () => {
        it('sends name/city/country + lang and reshapes the single item', async () => {
            const cap = onGet(DIRECT_URL, placeDirectResponseWire);
            const res = await fetchPlaceDirect('Kyoto', 'Kyoto', 'Japan');
            expect(() =>
                PlaceRecommendationsResultContract.parse(res)
            ).not.toThrow();
            expect(res).toEqual({
                query: 'Kyoto, Japan',
                cached: true,
                items: [placeRecommendationFixture],
            });
            const q = new URL(cap.url).searchParams;
            expect(q.get('name')).toBe('Kyoto');
            expect(q.get('city')).toBe('Kyoto');
            expect(q.get('country')).toBe('Japan');
            expect(q.get('lang')).toBeTruthy();
        });

        it('omits city / country params when blank', async () => {
            const cap = onGet(DIRECT_URL, placeDirectResponseWire);
            await fetchPlaceDirect('Kyoto', '  ', '');
            const q = new URL(cap.url).searchParams;
            expect(q.has('city')).toBe(false);
            expect(q.has('country')).toBe(false);
        });

        it('omits the Authorization header when no token is stored', async () => {
            setAuthToken(null);
            const cap = onGet(DIRECT_URL, placeDirectResponseWire);
            await fetchPlaceDirect('Kyoto', 'Kyoto', 'Japan');
            expect(cap.hasAuth).toBe(false);
        });

        it('throws a descriptive error on a non-OK response', async () => {
            onGet(DIRECT_URL, null, 404);
            await expect(
                fetchPlaceDirect('Kyoto', 'Kyoto', 'Japan')
            ).rejects.toThrow(/place-direct failed: 404/);
        });
    });

    // ---------- GET /place-details ----------

    describe('GET /place-details (fetchPlaceDetails)', () => {
        it('sends q/i/lang and merges all three slice groups', async () => {
            const cap = onGet(DETAILS_URL, placeDetailsResponseWire);
            const res = await fetchPlaceDetails('Kyoto, Japan', 0);
            expect(() => PlaceDetailsResultContract.parse(res)).not.toThrow();
            expect(res).toEqual({
                query: 'Kyoto, Japan',
                index: 0,
                cached: true,
                details: placeDetailsExpected,
            });
            const q = new URL(cap.url).searchParams;
            expect(q.get('q')).toBe('Kyoto, Japan');
            expect(q.get('i')).toBe('0');
            expect(q.get('lang')).toBeTruthy();
        });

        it('omits the Authorization header when no token is stored', async () => {
            setAuthToken(null);
            const cap = onGet(DETAILS_URL, placeDetailsResponseWire);
            await fetchPlaceDetails('Kyoto, Japan', 0);
            expect(cap.hasAuth).toBe(false);
        });

        it('throws a descriptive error on a non-OK response', async () => {
            onGet(DETAILS_URL, null, 500);
            await expect(fetchPlaceDetails('Kyoto', 0)).rejects.toThrow(
                /place-details failed: 500/
            );
        });
    });

    // ---------- progressive slices ----------

    describe('GET /place-details/prose (fetchPlaceProse)', () => {
        it('reshapes the prose group and satisfies the contract', async () => {
            const cap = onGet(`${DETAILS_URL}/prose`, { prose: proseWire });
            const res = await fetchPlaceProse('Kyoto', 0);
            expect(() => PlaceProseSliceContract.parse(res)).not.toThrow();
            expect(res).toEqual(proseExpected);
            const q = new URL(cap.url).searchParams;
            expect(q.get('q')).toBe('Kyoto');
            expect(q.get('i')).toBe('0');
            expect(q.get('lang')).toBeTruthy();
        });

        it('drops nameless hidden gems and defaults a missing why to ""', async () => {
            onGet(`${DETAILS_URL}/prose`, {
                prose: {
                    ...proseWire,
                    hidden_gems: [{ name: 'Keep' }, { why: 'no name — drop' }],
                    neighborhoods: {},
                },
            });
            const res = await fetchPlaceProse('Kyoto', 0);
            expect(res.hiddenGems).toEqual([{ name: 'Keep', why: '' }]);
            expect(res.neighborhoods).toEqual({ best: [], avoid: [] });
        });

        it('coerces absent optional prose fields to undefined', async () => {
            onGet(`${DETAILS_URL}/prose`, {
                prose: {
                    long_description: 'l',
                    country_description: 'c',
                    budget_description: 'b',
                    city_highlight: 'ch',
                    country_highlight: 'coh',
                    weather: 'w',
                    worst_time_to_visit: 'wt',
                },
            });
            const res = await fetchPlaceProse('Kyoto', 0);
            expect(res.culturalShock).toBeUndefined();
            expect(res.beforeYouGo).toBeUndefined();
            expect(res.hiddenGems).toBeUndefined();
            expect(res.neighborhoods).toBeUndefined();
        });

        it('throws a descriptive error on a non-OK response', async () => {
            onGet(`${DETAILS_URL}/prose`, null, 500);
            await expect(fetchPlaceProse('Kyoto', 0)).rejects.toThrow(
                /place-details\/prose failed: 500/
            );
        });
    });

    describe('GET /place-details/lists (fetchPlaceLists)', () => {
        it('reshapes the lists group and satisfies the contract', async () => {
            onGet(`${DETAILS_URL}/lists`, { lists: listsWire });
            const res = await fetchPlaceLists('Kyoto', 0);
            expect(() => PlaceListsSliceContract.parse(res)).not.toThrow();
            expect(res).toEqual(listsExpected);
        });

        it('maps a present nearby image_url and leaves localFlavor undefined when null', async () => {
            onGet(`${DETAILS_URL}/lists`, {
                lists: {
                    ...listsWire,
                    nearby_destinations: [
                        {
                            name: 'Osaka',
                            country: 'Japan',
                            kind: 'city',
                            why: 'Food',
                            lat: 34.69,
                            lng: 135.5,
                            image_url: 'https://img.example/osaka.jpg',
                        },
                    ],
                    local_flavor: null,
                },
            });
            const res = await fetchPlaceLists('Kyoto', 0);
            expect(res.nearbyDestinations?.[0].imageUrl).toBe(
                'https://img.example/osaka.jpg'
            );
            expect(res.localFlavor).toBeUndefined();
        });

        it('throws a descriptive error on a non-OK response', async () => {
            onGet(`${DETAILS_URL}/lists`, null, 500);
            await expect(fetchPlaceLists('Kyoto', 0)).rejects.toThrow(
                /place-details\/lists failed: 500/
            );
        });
    });

    describe('GET /place-details/facts (fetchPlaceFacts)', () => {
        it('reshapes the facts group and satisfies the contract', async () => {
            onGet(`${DETAILS_URL}/facts`, { facts: factsWire });
            const res = await fetchPlaceFacts('Kyoto', 0);
            expect(() => PlaceFactsSliceContract.parse(res)).not.toThrow();
            expect(res).toEqual(factsExpected);
        });

        it('collapses null sub-objects, drops sub-1 walkability, defaults arrays', async () => {
            onGet(`${DETAILS_URL}/facts`, {
                facts: {
                    currency: null,
                    safety: null,
                    coordinates: null,
                    travel_basics: null,
                    lodging: null,
                    cost_level: 2,
                    visa: null,
                    walkability: { rating: 0, note: '' },
                },
            });
            const res = await fetchPlaceFacts('Kyoto', 0);
            expect(() => PlaceFactsSliceContract.parse(res)).not.toThrow();
            expect(res.currency).toBeUndefined();
            expect(res.safety).toBeUndefined();
            expect(res.visa).toBeUndefined();
            expect(res.walkability).toBeUndefined();
            expect(res.costLevel).toBe(2);
            expect(res.airports).toEqual([]);
            expect(res.greatFor).toEqual([]);
        });

        it('keeps walkability with rating>=1 and defaults a missing note to ""', async () => {
            onGet(`${DETAILS_URL}/facts`, {
                facts: { ...factsWire, walkability: { rating: 3 } },
            });
            const res = await fetchPlaceFacts('Kyoto', 0);
            expect(res.walkability).toEqual({ rating: 3, note: '' });
        });

        it('throws a descriptive error on a non-OK response', async () => {
            onGet(`${DETAILS_URL}/facts`, null, 500);
            await expect(fetchPlaceFacts('Kyoto', 0)).rejects.toThrow(
                /place-details\/facts failed: 500/
            );
        });
    });

    // ---------- Zod drift guards ----------

    describe('Zod drift guards', () => {
        it('catches a MISSING required field on a recommendation', () => {
            const missing = {
                ...placeRecommendationFixture,
            } as Record<string, unknown>;
            delete missing.name;
            expect(() => PlaceRecommendationContract.parse(missing)).toThrow();
        });

        it('catches an UNEXPECTED extra field (strict shape)', () => {
            expect(() =>
                PlaceRecommendationContract.parse({
                    ...placeRecommendationFixture,
                    surprise: true,
                })
            ).toThrow();
        });

        it('catches a WRONG-typed field (string where number)', () => {
            expect(() =>
                PlaceRecommendationContract.parse({
                    ...placeRecommendationFixture,
                    rating: 'high',
                })
            ).toThrow();
        });

        it('catches drift in the result envelope (wrong-typed cached)', () => {
            expect(() =>
                PlaceRecommendationsResultContract.parse({
                    query: 'x',
                    cached: 'yes',
                    items: [],
                })
            ).toThrow();
        });

        it('catches an extra field on the merged details', () => {
            expect(() =>
                PlaceDetailsContract.parse({
                    ...placeDetailsExpected,
                    surprise: true,
                })
            ).toThrow();
        });
    });
});
