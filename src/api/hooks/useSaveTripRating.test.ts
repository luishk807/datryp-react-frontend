import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import { tripRatingPayloadFixture } from '../../test/fixtures/tripRating';
import { useSaveTripRating } from './useSaveTripRating';
import { tripRatingKey } from './useTripRating';
import { tripCompanionsKey } from './useTripCompanions';

const BASE = 'http://localhost:8000';
const TRIP = 'trip-7';

const reshaped = {
    myRating: 5,
    myExpectations: 'Hoped for great ramen — it delivered.',
    mySurprised: 'The train punctuality blew me away.',
    myAdvice: 'Get a Suica card on day one.',
    average: 4.5,
    count: 3,
};

describe('useSaveTripRating', () => {
    it('PUTs the recap, seeds the rating cache, and invalidates companions', async () => {
        let method = '';
        let path = '';
        let body: unknown = null;
        server.use(
            http.put(`${BASE}/me/trip-rating/:id`, async ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                body = await request.json();
                return HttpResponse.json(tripRatingPayloadFixture);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useSaveTripRating(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                tripId: TRIP,
                recap: {
                    rating: 5,
                    expectations: 'x',
                    surprised: 'y',
                    advice: 'z',
                },
            });
        });

        // Read the cache synchronously right after `act` — with gcTime: 0 an
        // un-observed setQueryData entry is collected on the next tick.
        // onSuccess drops the recomputed aggregate straight into the cache…
        expect(client.getQueryData(tripRatingKey(TRIP))).toEqual(reshaped);
        // …and refreshes the companions card that also carries ratings.
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: tripCompanionsKey(TRIP),
        });
        expect(method).toBe('PUT');
        expect(path).toBe('/me/trip-rating/trip-7');
        expect(body).toEqual({
            rating: 5,
            expectations: 'x',
            surprised: 'y',
            advice: 'z',
        });
    });

    it('nulls out omitted optional recap fields on the wire', async () => {
        let body: unknown = null;
        server.use(
            http.put(`${BASE}/me/trip-rating/:id`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(tripRatingPayloadFixture);
            })
        );
        const { result } = renderHookWithProviders(() => useSaveTripRating());

        await act(async () => {
            await result.current.mutateAsync({
                tripId: TRIP,
                recap: { rating: null },
            });
        });

        await waitFor(() => expect(result.current.data).toBeDefined());
        expect(body).toEqual({
            rating: null,
            expectations: null,
            surprised: null,
            advice: null,
        });
    });

    it('surfaces a backend error', async () => {
        server.use(
            http.put(
                `${BASE}/me/trip-rating/:id`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useSaveTripRating());

        await act(async () => {
            await result.current
                .mutateAsync({ tripId: TRIP, recap: { rating: 4 } })
                .catch(() => undefined);
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
