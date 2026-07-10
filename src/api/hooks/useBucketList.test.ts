import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    bucketListItemRawFixture,
    bucketListResponseRawFixture,
    bucketTripGenerationRawFixture,
} from '../../test/fixtures/bucketList';
import {
    useBucketList,
    useAddBucketListItem,
    useDeleteBucketListItem,
    useEnrichExistingBucketList,
    useGenerateTripFromBucket,
    bucketListKey,
} from './useBucketList';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const BASE = 'http://localhost:8000/me/bucket-list';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useBucketList', () => {
    it('fetches + reshapes the list, coalescing absent enrichment fields', async () => {
        server.use(
            http.get(BASE, () =>
                HttpResponse.json(bucketListResponseRawFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useBucketList());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0]).toMatchObject({
            id: 'goal-1',
            title: 'Chase the Aurora in Tromsø',
            tags: ['nature', 'winter'],
            enrichmentAttempted: true,
        });
        // Minimal (free-tier) item: enrichment fields absent → defaults.
        expect(result.current.data?.[1]).toMatchObject({
            id: 'goal-2',
            title: null,
            description: null,
            emoji: null,
            tags: [],
            enrichmentAttempted: false,
        });
    });

    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useBucketList());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(BASE, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useBucketList());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useAddBucketListItem', () => {
    it('POSTs the text and invalidates the bucket-list query', async () => {
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(BASE, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(bucketListItemRawFixture);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useAddBucketListItem(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('See the northern lights');
        });

        expect(body).toEqual({ text: 'See the northern lights' });
        await waitFor(() =>
            expect(result.current.data).toMatchObject({ id: 'goal-1' })
        );
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: bucketListKey });
    });
});

describe('useDeleteBucketListItem', () => {
    it('DELETEs by id and invalidates the bucket-list query', async () => {
        let deletedPath = '';
        server.use(
            http.delete(`${BASE}/:id`, ({ request }) => {
                deletedPath = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useDeleteBucketListItem(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('goal-1');
        });

        expect(deletedPath).toBe('/me/bucket-list/goal-1');
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: bucketListKey });
    });
});

describe('useEnrichExistingBucketList', () => {
    it('writes the returned enriched list straight into the cache', async () => {
        server.use(
            http.post(`${BASE}/enrich-existing`, () =>
                HttpResponse.json(bucketListResponseRawFixture)
            )
        );
        // A positive gcTime here (vs makeTestQueryClient's gcTime:0) keeps the
        // observer-less entry setQueryData writes from being evicted by the
        // GC timer that fires while `act` yields — otherwise this races.
        const client = new QueryClient({
            defaultOptions: { mutations: { retry: false } },
        });
        const { result } = renderHookWithProviders(
            () => useEnrichExistingBucketList(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync();
        });

        // onSuccess seeds the list cache via setQueryData (no re-fetch).
        await waitFor(() =>
            expect(client.getQueryData(bucketListKey)).toHaveLength(2)
        );
        expect(
            (client.getQueryData(bucketListKey) as Array<{ id: string }>)[0]
        ).toMatchObject({ id: 'goal-1' });
    });
});

describe('useGenerateTripFromBucket', () => {
    it('POSTs to the item itinerary route (bare-string arg) and invalidates itineraries', async () => {
        let requestPath = '';
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(`${BASE}/:id/itinerary`, async ({ request }) => {
                requestPath = new URL(request.url).pathname;
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(bucketTripGenerationRawFixture);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useGenerateTripFromBucket(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('goal-1');
        });

        expect(requestPath).toBe('/me/bucket-list/goal-1/itinerary');
        // Bare-string arg → no party/duration/styles overrides.
        expect(body).toMatchObject({
            party_size: null,
            duration_days: null,
            traveler_styles: null,
        });
        await waitFor(() =>
            expect(result.current.data).toEqual({
                itineraryId: 'trip-77',
                tripType: 'single',
                tripName: 'Aurora Week in Tromsø',
                countryName: 'Norway',
                durationDays: 6,
                rationale:
                    'Built around your aurora goal and Adventurer style.',
            })
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['myItineraries'],
        });
    });

    it('forwards the args-shape input (party size / duration / styles)', async () => {
        let requestPath = '';
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(`${BASE}/:id/itinerary`, async ({ request }) => {
                requestPath = new URL(request.url).pathname;
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(bucketTripGenerationRawFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useGenerateTripFromBucket()
        );

        await act(async () => {
            await result.current.mutateAsync({
                id: 'goal-2',
                input: {
                    partySize: 4,
                    durationDays: 7,
                    travelerStyles: ['Adventurer', 'Foodie'],
                },
            });
        });

        expect(requestPath).toBe('/me/bucket-list/goal-2/itinerary');
        expect(body).toMatchObject({
            party_size: 4,
            duration_days: 7,
            traveler_styles: ['Adventurer', 'Foodie'],
        });
    });
});
