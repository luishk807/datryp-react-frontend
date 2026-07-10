import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    savedPlaceWire,
    savedPlacesResponseWire,
    savedPlaceFixture,
} from '../../test/fixtures/savedPlaces';
import {
    useSavedPlaces,
    useSavePlace,
    useUnsavePlace,
    savedPlacesKey,
} from './useSavedPlaces';

// The hook gates on the authenticated user. Mock the context so a test can
// flip between signed-in and logged-out without a real UserProvider/`/auth/me`.
let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const BASE = 'http://localhost:8000/me/saved/places';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useSavedPlaces', () => {
    it('fetches + reshapes the saved list when signed in', async () => {
        server.use(
            http.get(BASE, () => HttpResponse.json(savedPlacesResponseWire))
        );
        const { result } = renderHookWithProviders(() => useSavedPlaces());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            items: [savedPlaceFixture],
            total: 1,
        });
    });

    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useSavedPlaces());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });
});

describe('useSavePlace', () => {
    it('POSTs the payload and invalidates the saved-places query', async () => {
        server.use(http.post(BASE, () => HttpResponse.json(savedPlaceWire)));
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useSavePlace(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                placeName: 'Eiffel Tower',
                placeCity: 'Paris',
                placeCountry: 'France',
            });
        });

        // mutation `data` lands on the next commit — poll for it rather than
        // reading the render that awaited `mutateAsync` (v5 timing quirk).
        await waitFor(() =>
            expect(result.current.data).toEqual(savedPlaceFixture)
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: savedPlacesKey,
        });
    });
});

describe('useUnsavePlace', () => {
    it('DELETEs by placeKey and invalidates the saved-places query', async () => {
        let deletedPath = '';
        server.use(
            http.delete(`${BASE}/:key`, ({ request }) => {
                deletedPath = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useUnsavePlace(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync('eiffel-tower-paris-france');
        });

        expect(deletedPath).toBe('/me/saved/places/eiffel-tower-paris-france');
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: savedPlacesKey,
        });
    });
});
