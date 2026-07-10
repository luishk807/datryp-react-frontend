import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    reviewItemRawFixture,
    reviewItemRawMinimalFixture,
    reviewsResponseRawFixture,
    reviewsResponseEmptyRawFixture,
    reviewInsightsRawFixture,
} from 'test/fixtures/reviews';
import {
    ReviewItemWireContract,
    ReviewsResponseWireContract,
    ReviewInsightsWireContract,
} from 'test/contracts/reviews.contract';
import {
    fetchPlaceReviews,
    createPlaceReview,
    upsertPlaceReview,
    fetchMyPlaceReview,
    fetchReviewInsights,
    updateReview,
    deleteReview,
    likeReview,
    unlikeReview,
} from './reviewsApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';

// Expected camelCase reshapes of the raw fixtures — the client maps
// snake_case wire fields and coalesces `tags: null` → [].
const expectedFullItem = {
    id: 'rev-1',
    author: { id: 'user-9', name: 'Mika' },
    rating: 5,
    text: 'The ramen alone was worth the flight.',
    tags: ['great-food', 'worth-it'],
    expectations: 'better',
    visibility: 'public',
    isVerifiedVisit: true,
    createdAt: '2026-07-01T12:00:00Z',
    updatedAt: '2026-07-02T09:30:00Z',
    likeCount: 4,
    viewerHasLiked: true,
    isOwner: false,
    friendLikers: [{ id: 'user-3', name: 'Ana', email: 'ana@example.com' }],
};

const expectedMinimalItem = {
    id: 'rev-2',
    author: { id: 'user-2', name: null },
    rating: 3,
    text: null,
    tags: [],
    expectations: null,
    visibility: 'anon',
    isVerifiedVisit: false,
    createdAt: '2026-06-15T08:00:00Z',
    updatedAt: '2026-06-15T08:00:00Z',
    likeCount: 0,
    viewerHasLiked: false,
    isOwner: true,
    friendLikers: [],
};

describe('reviewsApi contract — GET /places/:key/reviews', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('raw wire fixtures satisfy the contract', () => {
        expect(() =>
            ReviewsResponseWireContract.parse(reviewsResponseRawFixture)
        ).not.toThrow();
        expect(() =>
            ReviewsResponseWireContract.parse(reviewsResponseEmptyRawFixture)
        ).not.toThrow();
        expect(() =>
            ReviewItemWireContract.parse(reviewItemRawFixture)
        ).not.toThrow();
        expect(() =>
            ReviewItemWireContract.parse(reviewItemRawMinimalFixture)
        ).not.toThrow();
    });

    it('defaults query params, reshapes → camelCase, sends the bearer', async () => {
        let authHeader: string | null = null;
        let method: string | undefined;
        let params: Record<string, string> = {};
        server.use(
            http.get(`${API_BASE}/places/:key/reviews`, ({ request }) => {
                authHeader = request.headers.get('authorization');
                method = request.method;
                params = Object.fromEntries(new URL(request.url).searchParams);
                return HttpResponse.json(reviewsResponseRawFixture);
            })
        );
        const res = await fetchPlaceReviews('jp-tokyo-ramen-street');
        expect(res).toEqual({
            placeKey: 'jp-tokyo-ramen-street',
            total: 2,
            averageRating: 4,
            ratingCounts: { '5': 1, '3': 1 },
            viewerReviewId: 'rev-2',
            items: [expectedFullItem, expectedMinimalItem],
            page: 1,
            pageSize: 10,
            totalPages: 1,
            sort: 'recent',
        });
        expect(method).toBe('GET');
        expect(authHeader).toBe('Bearer test-token');
        expect(params).toEqual({ page: '1', page_size: '10', sort: 'recent' });
    });

    it('forwards explicit page / pageSize / sort as query params', async () => {
        let params: Record<string, string> = {};
        server.use(
            http.get(`${API_BASE}/places/:key/reviews`, ({ request }) => {
                params = Object.fromEntries(new URL(request.url).searchParams);
                return HttpResponse.json(reviewsResponseRawFixture);
            })
        );
        await fetchPlaceReviews('jp-tokyo-ramen-street', {
            page: 2,
            pageSize: 25,
            sort: 'highest',
        });
        expect(params).toEqual({ page: '2', page_size: '25', sort: 'highest' });
    });

    it('maps the empty (no reviews yet) page', async () => {
        server.use(
            http.get(`${API_BASE}/places/:key/reviews`, () =>
                HttpResponse.json(reviewsResponseEmptyRawFixture)
            )
        );
        const res = await fetchPlaceReviews('jp-tokyo-ramen-street');
        expect(res).toMatchObject({
            total: 0,
            averageRating: null,
            viewerReviewId: null,
            items: [],
            totalPages: 0,
        });
    });

    it('URL-encodes the place key in the path', async () => {
        let path: string | undefined;
        server.use(
            http.get(`${API_BASE}/places/:key/reviews`, ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json(reviewsResponseEmptyRawFixture);
            })
        );
        await fetchPlaceReviews('a/b c');
        expect(path).toBe('/places/a%2Fb%20c/reviews');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(`${API_BASE}/places/:key/reviews`, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(reviewsResponseEmptyRawFixture);
            })
        );
        await fetchPlaceReviews('jp-tokyo-ramen-street');
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(`${API_BASE}/places/:key/reviews`, () =>
                HttpResponse.json(
                    { detail: 'Place not found' },
                    { status: 404, statusText: 'Not Found' }
                )
            )
        );
        await expect(
            fetchPlaceReviews('jp-tokyo-ramen-street')
        ).rejects.toThrow('/places/:key/reviews 404 Not Found — Place not found');
    });

    it('contract catches drift (missing / extra / wrong visibility enum)', () => {
        const missing = { ...reviewsResponseRawFixture } as Record<
            string,
            unknown
        >;
        delete missing.total;
        expect(() => ReviewsResponseWireContract.parse(missing)).toThrow();
        expect(() =>
            ReviewsResponseWireContract.parse({
                ...reviewsResponseRawFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            ReviewItemWireContract.parse({
                ...reviewItemRawFixture,
                visibility: 'friends-only',
            })
        ).toThrow();
    });
});

describe('reviewsApi contract — POST /places/:key/reviews (create)', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('posts the snake_case create body, defaults text to null, reshapes result', async () => {
        let method: string | undefined;
        let contentType: string | null = null;
        let body: unknown;
        server.use(
            http.post(`${API_BASE}/places/:key/reviews`, async ({ request }) => {
                method = request.method;
                contentType = request.headers.get('content-type');
                body = await request.json();
                return HttpResponse.json(reviewItemRawFixture);
            })
        );
        const res = await createPlaceReview('jp-tokyo-ramen-street', {
            placeName: 'Ramen Street',
            placeCity: 'Tokyo',
            placeCountry: 'Japan',
            rating: 5,
        });
        expect(method).toBe('POST');
        expect(contentType).toContain('application/json');
        expect(body).toEqual({
            place_name: 'Ramen Street',
            place_city: 'Tokyo',
            place_country: 'Japan',
            rating: 5,
            text: null,
        });
        expect(res).toEqual(expectedFullItem);
    });

    it('passes through a provided text', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(`${API_BASE}/places/:key/reviews`, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(reviewItemRawFixture);
            })
        );
        await createPlaceReview('jp-tokyo-ramen-street', {
            placeName: 'Ramen Street',
            placeCity: 'Tokyo',
            placeCountry: 'Japan',
            rating: 4,
            text: 'Slurped happily.',
        });
        expect(body.text).toBe('Slurped happily.');
    });

    it('throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.post(
                `${API_BASE}/places/:key/reviews`,
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(
            createPlaceReview('jp-tokyo-ramen-street', {
                placeName: 'x',
                placeCity: 'y',
                placeCountry: 'z',
                rating: 3,
            })
        ).rejects.toThrow('create review 500');
    });
});

describe('reviewsApi contract — PUT /places/:key/reviews (upsert)', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('defaults tags/expectations/visibility/ids when omitted', async () => {
        let method: string | undefined;
        let body: unknown;
        server.use(
            http.put(`${API_BASE}/places/:key/reviews`, async ({ request }) => {
                method = request.method;
                body = await request.json();
                return HttpResponse.json(reviewItemRawFixture);
            })
        );
        const res = await upsertPlaceReview('jp-tokyo-ramen-street', {
            placeName: 'Ramen Street',
            placeCity: 'Tokyo',
            placeCountry: 'Japan',
            rating: 5,
        });
        expect(method).toBe('PUT');
        expect(body).toEqual({
            place_name: 'Ramen Street',
            place_city: 'Tokyo',
            place_country: 'Japan',
            rating: 5,
            text: null,
            tags: [],
            expectations: null,
            visibility: 'public',
            itinerary_id: null,
            activity_id: null,
        });
        expect(res).toEqual(expectedFullItem);
    });

    it('serialises the full upsert body (chips + visibility + source ids)', async () => {
        let body: unknown;
        server.use(
            http.put(`${API_BASE}/places/:key/reviews`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(reviewItemRawFixture);
            })
        );
        await upsertPlaceReview('jp-tokyo-ramen-street', {
            placeName: 'Ramen Street',
            placeCity: 'Tokyo',
            placeCountry: 'Japan',
            rating: 4,
            text: 'Great',
            tags: ['great-food'],
            expectations: 'better',
            visibility: 'anon',
            itineraryId: 'trip-1',
            activityId: 'act-9',
        });
        expect(body).toEqual({
            place_name: 'Ramen Street',
            place_city: 'Tokyo',
            place_country: 'Japan',
            rating: 4,
            text: 'Great',
            tags: ['great-food'],
            expectations: 'better',
            visibility: 'anon',
            itinerary_id: 'trip-1',
            activity_id: 'act-9',
        });
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.put(`${API_BASE}/places/:key/reviews`, () =>
                HttpResponse.json(
                    { detail: 'Bad rating' },
                    { status: 400, statusText: 'Bad Request' }
                )
            )
        );
        await expect(
            upsertPlaceReview('jp-tokyo-ramen-street', {
                placeName: 'x',
                placeCity: 'y',
                placeCountry: 'z',
                rating: 9,
            })
        ).rejects.toThrow('upsert review 400 Bad Request — Bad rating');
    });
});

describe('reviewsApi contract — GET /me/reviews/:key (my review)', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('reshapes the caller-owned review', async () => {
        let path: string | undefined;
        server.use(
            http.get(`${API_BASE}/me/reviews/:key`, ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json(reviewItemRawMinimalFixture);
            })
        );
        const res = await fetchMyPlaceReview('jp-tokyo-ramen-street');
        expect(res).toEqual(expectedMinimalItem);
        expect(path).toBe('/me/reviews/jp-tokyo-ramen-street');
    });

    it('returns null when the caller has no review (body null)', async () => {
        server.use(
            http.get(`${API_BASE}/me/reviews/:key`, () =>
                HttpResponse.json(null)
            )
        );
        expect(await fetchMyPlaceReview('jp-tokyo-ramen-street')).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(`${API_BASE}/me/reviews/:key`, () =>
                HttpResponse.json(
                    { detail: 'Unauthorized' },
                    { status: 401, statusText: 'Unauthorized' }
                )
            )
        );
        await expect(
            fetchMyPlaceReview('jp-tokyo-ramen-street')
        ).rejects.toThrow('get my review 401 Unauthorized — Unauthorized');
    });
});

describe('reviewsApi contract — GET /places/:key/review-insights', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('raw wire fixture satisfies the contract', () => {
        expect(() =>
            ReviewInsightsWireContract.parse(reviewInsightsRawFixture)
        ).not.toThrow();
    });

    it('reshapes the nested expectations breakdown → camelCase', async () => {
        server.use(
            http.get(`${API_BASE}/places/:key/review-insights`, () =>
                HttpResponse.json(reviewInsightsRawFixture)
            )
        );
        const res = await fetchReviewInsights('jp-tokyo-ramen-street');
        expect(res).toEqual({
            placeKey: 'jp-tokyo-ramen-street',
            total: 12,
            verifiedCount: 9,
            averageRating: 4.4,
            expectations: {
                total: 12,
                better: 7,
                asExpected: 4,
                overhyped: 1,
                livedUpPct: 92,
            },
            topTags: [
                { slug: 'great-food', count: 8, pct: 67 },
                { slug: 'worth-it', count: 5, pct: 42 },
            ],
        });
    });

    it('throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.get(
                `${API_BASE}/places/:key/review-insights`,
                () => new HttpResponse('nope', { status: 503 })
            )
        );
        await expect(
            fetchReviewInsights('jp-tokyo-ramen-street')
        ).rejects.toThrow('review insights 503');
    });

    it('contract catches drift (missing nested field / wrong type)', () => {
        expect(() =>
            ReviewInsightsWireContract.parse({
                ...reviewInsightsRawFixture,
                expectations: {
                    total: 12,
                    better: 7,
                    as_expected: 4,
                    overhyped: 1,
                    // lived_up_pct missing
                },
            })
        ).toThrow();
        expect(() =>
            ReviewInsightsWireContract.parse({
                ...reviewInsightsRawFixture,
                average_rating: 'high',
            })
        ).toThrow();
    });
});

describe('reviewsApi contract — PUT /reviews/:id (update)', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('sends only the provided fields (undefined keys dropped by JSON)', async () => {
        let method: string | undefined;
        let body: unknown;
        server.use(
            http.put(`${API_BASE}/reviews/:id`, async ({ request }) => {
                method = request.method;
                body = await request.json();
                return HttpResponse.json(reviewItemRawFixture);
            })
        );
        const res = await updateReview('rev-1', { rating: 4 });
        expect(method).toBe('PUT');
        expect(body).toEqual({ rating: 4 });
        expect(res).toEqual(expectedFullItem);
    });

    it('serialises every field when the full payload is supplied', async () => {
        let body: unknown;
        server.use(
            http.put(`${API_BASE}/reviews/:id`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(reviewItemRawFixture);
            })
        );
        await updateReview('rev-1', {
            rating: 2,
            text: 'Changed my mind',
            tags: ['overrated'],
            expectations: 'overhyped',
            visibility: 'private',
        });
        expect(body).toEqual({
            rating: 2,
            text: 'Changed my mind',
            tags: ['overrated'],
            expectations: 'overhyped',
            visibility: 'private',
        });
    });

    it('URL-encodes the review id and throws with detail on error', async () => {
        let path: string | undefined;
        server.use(
            http.put(`${API_BASE}/reviews/:id`, ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json(
                    { detail: 'Not your review' },
                    { status: 403, statusText: 'Forbidden' }
                );
            })
        );
        await expect(updateReview('a/b', { rating: 1 })).rejects.toThrow(
            'update review 403 Forbidden — Not your review'
        );
        expect(path).toBe('/reviews/a%2Fb');
    });
});

describe('reviewsApi contract — DELETE /reviews/:id + like/unlike', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('deleteReview issues DELETE with the bearer and resolves on 204', async () => {
        let method: string | undefined;
        let authHeader: string | null = null;
        server.use(
            http.delete(`${API_BASE}/reviews/:id`, ({ request }) => {
                method = request.method;
                authHeader = request.headers.get('authorization');
                return new HttpResponse(null, { status: 204 });
            })
        );
        await expect(deleteReview('rev-1')).resolves.toBeUndefined();
        expect(method).toBe('DELETE');
        expect(authHeader).toBe('Bearer test-token');
    });

    it('deleteReview throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.delete(`${API_BASE}/reviews/:id`, () =>
                HttpResponse.json(
                    { detail: 'Gone already' },
                    { status: 404, statusText: 'Not Found' }
                )
            )
        );
        await expect(deleteReview('rev-1')).rejects.toThrow(
            'delete review 404 Not Found — Gone already'
        );
    });

    it('likeReview POSTs to /reviews/:id/like', async () => {
        let method: string | undefined;
        let path: string | undefined;
        server.use(
            http.post(`${API_BASE}/reviews/:id/like`, ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        await expect(likeReview('rev-1')).resolves.toBeUndefined();
        expect(method).toBe('POST');
        expect(path).toBe('/reviews/rev-1/like');
    });

    it('likeReview throws (no detail suffix) on a non-JSON error', async () => {
        server.use(
            http.post(
                `${API_BASE}/reviews/:id/like`,
                () => new HttpResponse('nope', { status: 500 })
            )
        );
        await expect(likeReview('rev-1')).rejects.toThrow('like review 500');
    });

    it('unlikeReview issues DELETE to /reviews/:id/like', async () => {
        let method: string | undefined;
        server.use(
            http.delete(`${API_BASE}/reviews/:id/like`, ({ request }) => {
                method = request.method;
                return new HttpResponse(null, { status: 204 });
            })
        );
        await expect(unlikeReview('rev-1')).resolves.toBeUndefined();
        expect(method).toBe('DELETE');
    });

    it('unlikeReview omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.delete(`${API_BASE}/reviews/:id/like`, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return new HttpResponse(null, { status: 204 });
            })
        );
        await unlikeReview('rev-1');
        expect(authHeader).toBeNull();
    });

    it('unlikeReview throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.delete(`${API_BASE}/reviews/:id/like`, () =>
                HttpResponse.json(
                    { detail: 'Not liked' },
                    { status: 409, statusText: 'Conflict' }
                )
            )
        );
        await expect(unlikeReview('rev-1')).rejects.toThrow(
            'unlike review 409 Conflict — Not liked'
        );
    });
});
