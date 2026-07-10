import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    savedCountryWire,
    savedCountriesResponseWire,
    savedCountryFixture,
} from '../../test/fixtures/savedCountries';
import {
    useSavedCountries,
    useSaveCountry,
    useUnsaveCountry,
    savedCountriesKey,
} from './useSavedCountries';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const BASE = 'http://localhost:8000/me/saved/countries';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useSavedCountries', () => {
    it('fetches + reshapes the saved list when signed in', async () => {
        server.use(
            http.get(BASE, () => HttpResponse.json(savedCountriesResponseWire))
        );
        const { result } = renderHookWithProviders(() => useSavedCountries());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            items: [savedCountryFixture],
            total: 1,
        });
    });

    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useSavedCountries());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(BASE, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useSavedCountries());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useSaveCountry', () => {
    it('POSTs the ISO code and invalidates the saved-countries query', async () => {
        let body: Record<string, unknown> | null = null;
        server.use(
            http.post(BASE, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(savedCountryWire);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useSaveCountry(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync('JP');
        });

        expect(body).toEqual({ code: 'JP' });
        await waitFor(() =>
            expect(result.current.data).toEqual(savedCountryFixture)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: savedCountriesKey,
        });
    });
});

describe('useUnsaveCountry', () => {
    it('DELETEs by code and invalidates the saved-countries query', async () => {
        let deletedPath = '';
        server.use(
            http.delete(`${BASE}/:code`, ({ request }) => {
                deletedPath = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useUnsaveCountry(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync('JP');
        });

        expect(deletedPath).toBe('/me/saved/countries/JP');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: savedCountriesKey,
        });
    });
});
