import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    tripRatingPayloadFixture,
    tripRatingEmptyPayloadFixture,
} from '../../test/fixtures/tripRating';
import { useTripRating, tripRatingKey } from './useTripRating';

const BASE = 'http://localhost:8000';
const TRIP = 'trip-4';

describe('tripRatingKey', () => {
    it('namespaces the cache key by trip id', () => {
        expect(tripRatingKey(TRIP)).toEqual(['tripRating', TRIP]);
    });
});

describe('useTripRating', () => {
    it('is disabled (no request) when no trip id is given', () => {
        const { result } = renderHookWithProviders(() =>
            useTripRating(undefined)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled (no request) when the enabled flag is false', () => {
        const { result } = renderHookWithProviders(() =>
            useTripRating(TRIP, false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the viewer rating + aggregate', async () => {
        server.use(
            http.get(`${BASE}/me/trip-rating/:id`, () =>
                HttpResponse.json(tripRatingPayloadFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useTripRating(TRIP));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            myRating: 5,
            myExpectations: 'Hoped for great ramen — it delivered.',
            mySurprised: 'The train punctuality blew me away.',
            myAdvice: 'Get a Suica card on day one.',
            average: 4.5,
            count: 3,
        });
    });

    it('reshapes the all-null (nobody rated) payload', async () => {
        server.use(
            http.get(`${BASE}/me/trip-rating/:id`, () =>
                HttpResponse.json(tripRatingEmptyPayloadFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useTripRating(TRIP));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            myRating: null,
            average: null,
            count: 0,
        });
    });

    it('surfaces a backend error', async () => {
        server.use(
            http.get(
                `${BASE}/me/trip-rating/:id`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useTripRating(TRIP));
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
