import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    savedCityWire,
    savedCitiesResponseWire,
    savedCityFixture,
} from '../../test/fixtures/savedCities';
import {
    useSavedCities,
    useSaveCity,
    useUnsaveCity,
    savedCitiesKey,
} from './useSavedCities';

// The hook gates on the signed-in user; mock the context so a test can flip
// between signed-in and logged-out without a real UserProvider/`/auth/me`.
let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const BASE = 'http://localhost:8000/me/saved/cities';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useSavedCities', () => {
    it('fetches + reshapes the saved list when signed in', async () => {
        server.use(
            http.get(BASE, () => HttpResponse.json(savedCitiesResponseWire))
        );
        const { result } = renderHookWithProviders(() => useSavedCities());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            items: [savedCityFixture],
            total: 1,
        });
    });

    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useSavedCities());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(BASE, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useSavedCities());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useSaveCity', () => {
    it('POSTs the mapped payload and invalidates the saved-cities query', async () => {
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(BASE, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(savedCityWire);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useSaveCity(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                name: 'Kyoto',
                country: 'Japan',
                code: 'JP',
                imageUrl: 'https://img.example/kyoto.jpg',
            });
        });

        expect(body).toEqual({
            name: 'Kyoto',
            country: 'Japan',
            code: 'JP',
            image_url: 'https://img.example/kyoto.jpg',
        });
        // mutation `data` lands on the next commit — poll for it (v5 timing).
        await waitFor(() =>
            expect(result.current.data).toEqual(savedCityFixture)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: savedCitiesKey,
        });
    });
});

describe('useUnsaveCity', () => {
    it('DELETEs by slug and invalidates the saved-cities query', async () => {
        let deletedPath = '';
        server.use(
            http.delete(`${BASE}/:slug`, ({ request }) => {
                deletedPath = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useUnsaveCity(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync('kyoto-jp');
        });

        expect(deletedPath).toBe('/me/saved/cities/kyoto-jp');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: savedCitiesKey,
        });
    });
});
