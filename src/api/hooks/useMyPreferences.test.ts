import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    preferencesWireFixture,
    interestsCatalogWireFixture,
    travelerStylesCatalogWireFixture,
    gendersCatalogWireFixture,
} from '../../test/fixtures/preferences';
import { queryKeys } from '../queryKeys';
import { nearestAirportKey, nearestTrainStationKey } from './useHomeDeparture';
import {
    useMyPreferences,
    useInterestsCatalog,
    useTravelerStylesCatalog,
    useGendersCatalog,
    useUpdateMyPreferences,
    preferencesKey,
} from './useMyPreferences';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const BASE = 'http://localhost:8000';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useMyPreferences', () => {
    it('fetches + reshapes preferences when signed in', async () => {
        server.use(
            http.get(`${BASE}/me/preferences`, () =>
                HttpResponse.json(preferencesWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useMyPreferences());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            birthYear: 1990,
            countryOfBirthCode: 'US',
            homeCity: 'Panama City',
            interests: ['food', 'hiking'],
            shareVisitedPlaces: true,
        });
    });

    it('is disabled when logged out (no request)', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useMyPreferences());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });
});

describe('preference catalogs', () => {
    it('useInterestsCatalog returns the interests list', async () => {
        server.use(
            http.get(`${BASE}/me/interests-catalog`, () =>
                HttpResponse.json(interestsCatalogWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useInterestsCatalog()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(
            interestsCatalogWireFixture.interests
        );
    });

    it('useTravelerStylesCatalog returns the traveler_styles list', async () => {
        server.use(
            http.get(`${BASE}/me/traveler-styles-catalog`, () =>
                HttpResponse.json(travelerStylesCatalogWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useTravelerStylesCatalog()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(
            travelerStylesCatalogWireFixture.traveler_styles
        );
    });

    it('useGendersCatalog returns the genders list', async () => {
        server.use(
            http.get(`${BASE}/me/genders-catalog`, () =>
                HttpResponse.json(gendersCatalogWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useGendersCatalog());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(gendersCatalogWireFixture.genders);
    });

    it('surfaces an error when a catalog endpoint fails', async () => {
        server.use(
            http.get(
                `${BASE}/me/interests-catalog`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useInterestsCatalog()
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useUpdateMyPreferences', () => {
    it('PATCHes, seeds the cache, and invalidates home-departure keys when home changes', async () => {
        server.use(
            http.patch(`${BASE}/me/preferences`, () =>
                HttpResponse.json(preferencesWireFixture)
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useUpdateMyPreferences(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync({ homeCity: 'Lisbon' });
        });

        await waitFor(() =>
            expect(client.getQueryData(preferencesKey)).toMatchObject({
                homeCity: 'Panama City',
            })
        );
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: queryKeys.currentUser,
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: nearestAirportKey,
        });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: nearestTrainStationKey,
        });
    });

    it('does not invalidate home-departure keys when no home field changed', async () => {
        server.use(
            http.patch(`${BASE}/me/preferences`, () =>
                HttpResponse.json(preferencesWireFixture)
            )
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(
            () => useUpdateMyPreferences(),
            { client }
        );

        await act(async () => {
            await result.current.mutateAsync({ interests: ['food'] });
        });

        await waitFor(() =>
            expect(invalidateSpy).toHaveBeenCalledWith({
                queryKey: queryKeys.currentUser,
            })
        );
        expect(invalidateSpy).not.toHaveBeenCalledWith({
            queryKey: nearestAirportKey,
        });
        expect(invalidateSpy).not.toHaveBeenCalledWith({
            queryKey: nearestTrainStationKey,
        });
    });
});
