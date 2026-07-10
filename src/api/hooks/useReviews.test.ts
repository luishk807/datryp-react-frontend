import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    reviewItemRawFixture,
    reviewsResponseRawFixture,
    reviewInsightsRawFixture,
} from '../../test/fixtures/reviews';
import {
    useMyPlaceReview,
    usePlaceReviewInsights,
    usePlaceReviews,
    useUpsertReview,
    useCreateReview,
    useUpdateReview,
    useDeleteReview,
    useToggleReviewLike,
} from './useReviews';

const BASE = 'http://localhost:8000';
const PLACE = 'jp-tokyo-ramen-street';

describe('useMyPlaceReview', () => {
    it('is disabled when placeKey is null (no request)', () => {
        const { result } = renderHookWithProviders(() =>
            useMyPlaceReview(null)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the viewer own review', async () => {
        server.use(
            http.get(`${BASE}/me/reviews/:key`, () =>
                HttpResponse.json(reviewItemRawFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useMyPlaceReview(PLACE)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            id: 'rev-1',
            isVerifiedVisit: true,
            tags: ['great-food', 'worth-it'],
        });
    });
});

describe('usePlaceReviewInsights', () => {
    it('fetches aggregated insights', async () => {
        server.use(
            http.get(`${BASE}/places/:key/review-insights`, () =>
                HttpResponse.json(reviewInsightsRawFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceReviewInsights(PLACE)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            verifiedCount: 9,
            expectations: { asExpected: 4, livedUpPct: 92 },
        });
    });
});

describe('usePlaceReviews', () => {
    it('sends default paging/sort params and returns the page', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(`${BASE}/places/:key/reviews`, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(reviewsResponseRawFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceReviews(PLACE)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('page')).toBe('1');
        expect(params!.get('page_size')).toBe('10');
        expect(params!.get('sort')).toBe('recent');
        expect(result.current.data?.items).toHaveLength(2);
    });

    it('forwards custom paging/sort params', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(`${BASE}/places/:key/reviews`, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(reviewsResponseRawFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceReviews(PLACE, { page: 3, pageSize: 25, sort: 'highest' })
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('page')).toBe('3');
        expect(params!.get('page_size')).toBe('25');
        expect(params!.get('sort')).toBe('highest');
    });
});

describe('useUpsertReview', () => {
    it('writes the viewer review into the cache and invalidates the list + insights', async () => {
        server.use(
            http.put(`${BASE}/places/:key/reviews`, () =>
                HttpResponse.json(reviewItemRawFixture)
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useUpsertReview(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                placeKey: PLACE,
                payload: {
                    placeName: 'Ramen Street',
                    placeCity: 'Tokyo',
                    placeCountry: 'Japan',
                    rating: 5,
                },
            });
        });

        // onSuccess seeds the viewer own-review cache via setQueryData…
        expect(client.getQueryData(['myReview', PLACE])).toMatchObject({
            id: 'rev-1',
        });
        // …and invalidates the place review list + the aggregate insights.
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['reviews', PLACE],
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['reviewInsights', PLACE],
        });
    });
});

describe('useCreateReview', () => {
    it('POSTs a new review and invalidates the place review list', async () => {
        server.use(
            http.post(`${BASE}/places/:key/reviews`, () =>
                HttpResponse.json(reviewItemRawFixture)
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useCreateReview(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                placeKey: PLACE,
                payload: {
                    placeName: 'Ramen Street',
                    placeCity: 'Tokyo',
                    placeCountry: 'Japan',
                    rating: 5,
                },
            });
        });

        await waitFor(() =>
            expect(result.current.data).toMatchObject({ id: 'rev-1' })
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['reviews', PLACE],
        });
    });
});

describe('useUpdateReview', () => {
    it('PUTs the edit by reviewId and invalidates the place review list', async () => {
        let path = '';
        server.use(
            http.put(`${BASE}/reviews/:id`, ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json(reviewItemRawFixture);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useUpdateReview(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                placeKey: PLACE,
                reviewId: 'rev-1',
                payload: { rating: 4 },
            });
        });

        await waitFor(() =>
            expect(result.current.data).toMatchObject({ id: 'rev-1' })
        );
        expect(path).toBe('/reviews/rev-1');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['reviews', PLACE],
        });
    });
});

describe('useDeleteReview', () => {
    it('DELETEs by reviewId and invalidates the place review list', async () => {
        let path = '';
        server.use(
            http.delete(`${BASE}/reviews/:id`, ({ request }) => {
                path = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useDeleteReview(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                placeKey: PLACE,
                reviewId: 'rev-9',
            });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(path).toBe('/reviews/rev-9');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['reviews', PLACE],
        });
    });
});

describe('useToggleReviewLike', () => {
    it('POSTs a like when not currently liked', async () => {
        let method = '';
        server.use(
            http.post(`${BASE}/reviews/:id/like`, ({ request }) => {
                method = request.method;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const { result } = renderHookWithProviders(() => useToggleReviewLike());

        await act(async () => {
            await result.current.mutateAsync({
                placeKey: PLACE,
                reviewId: 'rev-1',
                currentlyLiked: false,
            });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(method).toBe('POST');
    });

    it('DELETEs the like when currently liked, and invalidates the list', async () => {
        let method = '';
        server.use(
            http.delete(`${BASE}/reviews/:id/like`, ({ request }) => {
                method = request.method;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useToggleReviewLike(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync({
                placeKey: PLACE,
                reviewId: 'rev-1',
                currentlyLiked: true,
            });
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(method).toBe('DELETE');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['reviews', PLACE],
        });
    });
});
