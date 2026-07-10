import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    visitedCountryWire,
    visitedCountriesResponseWire,
    visitedCountryFixture,
} from '../../test/fixtures/visitedCountries';
import {
    useVisitedCountries,
    useMarkVisitedCountry,
    useUnmarkVisitedCountry,
    visitedCountriesKey,
} from './useVisitedCountries';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const BASE = 'http://localhost:8000/me/visited-countries';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useVisitedCountries', () => {
    it('fetches + reshapes the visited list when signed in', async () => {
        server.use(
            http.get(BASE, () =>
                HttpResponse.json(visitedCountriesResponseWire)
            )
        );
        const { result } = renderHookWithProviders(() => useVisitedCountries());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            items: [visitedCountryFixture],
            total: 1,
        });
    });

    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useVisitedCountries());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(BASE, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useVisitedCountries());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useMarkVisitedCountry', () => {
    it('POSTs the ISO code and invalidates the visited-countries query', async () => {
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(BASE, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(visitedCountryWire);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useMarkVisitedCountry(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('IT');
        });

        expect(body).toEqual({ code: 'IT' });
        await waitFor(() =>
            expect(result.current.data).toEqual(visitedCountryFixture)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: visitedCountriesKey,
        });
    });
});

describe('useUnmarkVisitedCountry', () => {
    it('DELETEs by code and invalidates the visited-countries query', async () => {
        let deletedPath = '';
        server.use(
            http.delete(`${BASE}/:code`, ({ request }) => {
                deletedPath = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useUnmarkVisitedCountry(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync('IT');
        });

        expect(deletedPath).toBe('/me/visited-countries/IT');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: visitedCountriesKey,
        });
    });
});
