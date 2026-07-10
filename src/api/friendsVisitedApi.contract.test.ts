import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    friendsVisitedWireFixture,
    friendsVisitedAllWireFixture,
} from 'test/fixtures/friendsVisited';
import {
    FriendsVisitedWireContract,
    FriendsVisitedAllWireContract,
} from 'test/contracts/friendsVisited.contract';
import {
    fetchFriendsVisited,
    fetchFriendsVisitedAll,
} from './friendsVisitedApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';

// Contract tests for the friends-visited boundary: drive the REAL client
// through MSW so the bearer token, the per-page reshape (incl. tolerated
// missing rating/review fields), the review_key query, the three grouped Atlas
// reshapes, and both error branches are exercised.
describe('friendsVisitedApi contract — /me/friends-visited', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('wire fixtures satisfy the contracts', () => {
        expect(() =>
            FriendsVisitedWireContract.parse(friendsVisitedWireFixture)
        ).not.toThrow();
        expect(() =>
            FriendsVisitedAllWireContract.parse(friendsVisitedAllWireFixture)
        ).not.toThrow();
    });

    // ── fetchFriendsVisitedAll ──
    it('fetchFriendsVisitedAll reshapes the three grouped lists + sends bearer', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(`${API_BASE}/me/friends-visited/all`, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(friendsVisitedAllWireFixture);
            })
        );
        const result = await fetchFriendsVisitedAll();
        expect(authHeader).toBe('Bearer test-token');
        expect(result).toEqual({
            countries: [
                {
                    countryCode: 'JP',
                    countryName: 'Japan',
                    friends: [
                        {
                            userId: 'u1',
                            name: 'Ada Traveler',
                            profileImageUrl: null,
                        },
                    ],
                },
            ],
            cities: [
                {
                    citySlug: 'kyoto-jp',
                    cityName: 'Kyoto',
                    countryName: 'Japan',
                    countryCode: 'JP',
                    latitude: 35.0116,
                    longitude: 135.7681,
                    friends: [
                        {
                            userId: 'u2',
                            name: 'Ben Nomad',
                            profileImageUrl: 'https://images.example.com/ben.jpg',
                        },
                    ],
                },
            ],
            places: [
                {
                    placeKey: 'fushimi-inari',
                    placeName: 'Fushimi Inari Taisha',
                    placeCity: 'Kyoto',
                    placeCountry: 'Japan',
                    latitude: 34.9671,
                    longitude: 135.7727,
                    friends: [
                        {
                            userId: 'u1',
                            name: 'Ada Traveler',
                            profileImageUrl: null,
                        },
                    ],
                },
            ],
        });
    });

    it('fetchFriendsVisitedAll throws on a non-OK response', async () => {
        server.use(
            http.get(
                `${API_BASE}/me/friends-visited/all`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        await expect(fetchFriendsVisitedAll()).rejects.toThrow(
            '/me/friends-visited/all 500'
        );
    });

    // ── fetchFriendsVisited ──
    it('fetchFriendsVisited (place) reshapes items + omits the review_key query', async () => {
        let search = 'unset';
        let path = '';
        server.use(
            http.get(
                `${API_BASE}/me/friends-visited/place/:key`,
                ({ request }) => {
                    const u = new URL(request.url);
                    search = u.search;
                    path = u.pathname;
                    return HttpResponse.json(friendsVisitedWireFixture);
                }
            )
        );
        const result = await fetchFriendsVisited('place', 'fushimi-inari');
        expect(search).toBe('');
        expect(path).toBe('/me/friends-visited/place/fushimi-inari');
        expect(result).toEqual({
            count: 2,
            friends: [
                {
                    userId: 'u1',
                    name: 'Ada Traveler',
                    profileImageUrl: 'https://images.example.com/ada.jpg',
                    visitedAt: '2026-05-01T00:00:00Z',
                    rating: 5,
                    reviewText: 'Unforgettable sunrise hike.',
                },
                {
                    userId: 'u2',
                    name: 'Ben Nomad',
                    profileImageUrl: null,
                    visitedAt: '2026-04-14T00:00:00Z',
                    rating: null,
                    reviewText: null,
                },
            ],
        });
    });

    it('fetchFriendsVisited forwards review_key (url-encoded) for city/country pages', async () => {
        let reviewKey: string | null = null;
        server.use(
            http.get(
                `${API_BASE}/me/friends-visited/city/:key`,
                ({ request }) => {
                    reviewKey = new URL(request.url).searchParams.get(
                        'review_key'
                    );
                    return HttpResponse.json(friendsVisitedWireFixture);
                }
            )
        );
        await fetchFriendsVisited('city', 'kyoto-jp', 'city:kyoto/jp');
        expect(reviewKey).toBe('city:kyoto/jp');
    });

    it('fetchFriendsVisited tolerates older backends missing rating/review_text', async () => {
        server.use(
            http.get(`${API_BASE}/me/friends-visited/place/:key`, () =>
                HttpResponse.json({
                    count: 1,
                    friends: [
                        {
                            user_id: 'u9',
                            name: 'Old Client',
                            profile_image_url: null,
                            visited_at: '2026-01-01T00:00:00Z',
                        },
                    ],
                })
            )
        );
        const result = await fetchFriendsVisited('place', 'x');
        expect(result.friends[0].rating).toBeNull();
        expect(result.friends[0].reviewText).toBeNull();
    });

    it('fetchFriendsVisited returns an empty friends list unchanged', async () => {
        server.use(
            http.get(`${API_BASE}/me/friends-visited/country/:key`, () =>
                HttpResponse.json({ count: 0, friends: [] })
            )
        );
        expect(await fetchFriendsVisited('country', 'US')).toEqual({
            count: 0,
            friends: [],
        });
    });

    it('fetchFriendsVisited throws with the backend detail on a non-OK JSON error', async () => {
        server.use(
            http.get(`${API_BASE}/me/friends-visited/place/:key`, () =>
                HttpResponse.json({ detail: 'Not allowed' }, { status: 403 })
            )
        );
        await expect(fetchFriendsVisited('place', 'x')).rejects.toThrow(
            '/me/friends-visited/place 403 — Not allowed'
        );
    });

    it('fetchFriendsVisited throws a bare status message when the error body is not JSON', async () => {
        server.use(
            http.get(
                `${API_BASE}/me/friends-visited/place/:key`,
                () =>
                    new HttpResponse('nope', {
                        status: 500,
                        headers: { 'content-type': 'text/plain' },
                    })
            )
        );
        await expect(fetchFriendsVisited('place', 'x')).rejects.toThrow(
            '/me/friends-visited/place 500'
        );
    });

    it('contracts catch drift (missing / extra / wrong-typed)', () => {
        expect(() =>
            FriendsVisitedWireContract.parse({ count: 1 })
        ).toThrow();
        expect(() =>
            FriendsVisitedWireContract.parse({
                ...friendsVisitedWireFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            FriendsVisitedAllWireContract.parse({
                ...friendsVisitedAllWireFixture,
                cities: [
                    {
                        ...friendsVisitedAllWireFixture.cities[0],
                        latitude: '35',
                    },
                ],
            })
        ).toThrow();
    });
});
