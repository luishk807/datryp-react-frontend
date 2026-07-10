import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    visitedCityWire,
    visitedCitiesResponseWire,
    visitedCityFixture,
} from '../../test/fixtures/visitedCities';
import {
    useVisitedCities,
    useMarkVisitedCity,
    useUnmarkVisitedCity,
    visitedCitiesKey,
} from './useVisitedCities';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const BASE = 'http://localhost:8000/me/visited-cities';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useVisitedCities', () => {
    it('fetches + reshapes the visited list (incl. null-coord fallback)', async () => {
        server.use(
            http.get(BASE, () => HttpResponse.json(visitedCitiesResponseWire))
        );
        const { result } = renderHookWithProviders(() => useVisitedCities());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.items).toHaveLength(2);
        expect(result.current.data?.items[0]).toEqual(visitedCityFixture);
        expect(result.current.data?.items[1]).toMatchObject({
            citySlug: 'osaka-jp',
            latitude: null,
            longitude: null,
        });
    });

    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useVisitedCities());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(BASE, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useVisitedCities());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useMarkVisitedCity', () => {
    it('POSTs the mapped payload and invalidates the visited-cities query', async () => {
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(BASE, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(visitedCityWire);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useMarkVisitedCity(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                name: 'Rome',
                country: 'Italy',
                code: 'IT',
            });
        });

        expect(body).toEqual({ name: 'Rome', country: 'Italy', code: 'IT' });
        await waitFor(() =>
            expect(result.current.data).toEqual(visitedCityFixture)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: visitedCitiesKey,
        });
    });
});

describe('useUnmarkVisitedCity', () => {
    it('DELETEs by slug and invalidates the visited-cities query', async () => {
        let deletedPath = '';
        server.use(
            http.delete(`${BASE}/:slug`, ({ request }) => {
                deletedPath = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useUnmarkVisitedCity(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('rome-it');
        });

        expect(deletedPath).toBe('/me/visited-cities/rome-it');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: visitedCitiesKey,
        });
    });
});
