import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    tripCompanionsPayloadFixture,
    tripCompanionsEmptyFixture,
} from '../../test/fixtures/tripCompanions';
import { useTripCompanions, tripCompanionsKey } from './useTripCompanions';

const BASE = 'http://localhost:8000';
const TRIP = 'trip-6';

describe('tripCompanionsKey', () => {
    it('namespaces the cache key by trip id', () => {
        expect(tripCompanionsKey(TRIP)).toEqual(['tripCompanions', TRIP]);
    });
});

describe('useTripCompanions', () => {
    it('is disabled (no request) when no trip id is given', () => {
        const { result } = renderHookWithProviders(() =>
            useTripCompanions(undefined)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled (no request) when the enabled flag is false', () => {
        const { result } = renderHookWithProviders(() =>
            useTripCompanions(TRIP, false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes each companion to camelCase', async () => {
        server.use(
            http.get(`${BASE}/me/trip-companions/:id`, () =>
                HttpResponse.json(tripCompanionsPayloadFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useTripCompanions(TRIP)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([
            {
                userId: 'user-1',
                name: 'Alice',
                profileImageUrl: 'https://cdn.example.com/alice.jpg',
                rating: 5,
                favoritePlace: 'Fushimi Inari',
            },
            {
                userId: 'user-2',
                name: null,
                profileImageUrl: null,
                rating: null,
                favoritePlace: null,
            },
        ]);
    });

    it('returns an empty list when nobody joined', async () => {
        server.use(
            http.get(`${BASE}/me/trip-companions/:id`, () =>
                HttpResponse.json(tripCompanionsEmptyFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useTripCompanions(TRIP)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it('surfaces a backend error', async () => {
        server.use(
            http.get(
                `${BASE}/me/trip-companions/:id`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useTripCompanions(TRIP)
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
