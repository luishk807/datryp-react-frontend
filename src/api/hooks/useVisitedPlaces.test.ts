import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    visitedPlaceWire,
    visitedPlacesResponseWire,
    visitedPlaceFixture,
} from '../../test/fixtures/visitedPlaces';
import {
    useVisitedPlaces,
    useMarkVisited,
    useUnmarkVisited,
    visitedPlacesKey,
} from './useVisitedPlaces';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const BASE = 'http://localhost:8000/me/visited';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useVisitedPlaces', () => {
    it('fetches + reshapes the visited list, defaulting missing trips to []', async () => {
        server.use(
            http.get(BASE, () => HttpResponse.json(visitedPlacesResponseWire))
        );
        const { result } = renderHookWithProviders(() => useVisitedPlaces());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.items).toHaveLength(2);
        expect(result.current.data?.items[0]).toEqual(visitedPlaceFixture);
        // Legacy item with no `trips` key → `r.trips ?? []` yields [].
        expect(result.current.data?.items[1].trips).toEqual([]);
    });

    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useVisitedPlaces());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(BASE, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useVisitedPlaces());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useMarkVisited', () => {
    it('POSTs the mapped payload and invalidates the visited-places query', async () => {
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(BASE, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(visitedPlaceWire);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useMarkVisited(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                placeName: 'Colosseum',
                placeCity: 'Rome',
                placeCountry: 'Italy',
                countryCode: 'IT',
                latitude: 41.8902,
                longitude: 12.4922,
            });
        });

        expect(body).toEqual({
            place_name: 'Colosseum',
            place_city: 'Rome',
            place_country: 'Italy',
            country_code: 'IT',
            latitude: 41.8902,
            longitude: 12.4922,
        });
        await waitFor(() =>
            expect(result.current.data).toEqual(visitedPlaceFixture)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: visitedPlacesKey,
        });
    });
});

describe('useUnmarkVisited', () => {
    it('DELETEs by placeKey and invalidates the visited-places query', async () => {
        let deletedPath = '';
        server.use(
            http.delete(`${BASE}/:key`, ({ request }) => {
                deletedPath = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useUnmarkVisited(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync('colosseum-rome-italy');
        });

        expect(deletedPath).toBe('/me/visited/colosseum-rome-italy');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: visitedPlacesKey,
        });
    });
});
