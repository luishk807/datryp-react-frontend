import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    nearestAirportEnvelopeFixture,
    nearestStationEnvelopeFixture,
} from '../../test/fixtures/homeDeparture';
import { useNearestAirport, useNearestTrainStation } from './useHomeDeparture';

// Gated on a user WITH home coordinates set.
let mockUser: {
    id: string;
    homeLatitude?: number | null;
    homeLongitude?: number | null;
} | null = { id: 'u1', homeLatitude: 8.98, homeLongitude: -79.52 };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const AIRPORT = 'http://localhost:8000/me/nearest-airport';
const STATION = 'http://localhost:8000/me/nearest-train-station';

beforeEach(() => {
    mockUser = { id: 'u1', homeLatitude: 8.98, homeLongitude: -79.52 };
});

describe('useNearestAirport', () => {
    it('fetches + reshapes the airport envelope when coords are set', async () => {
        server.use(
            http.get(AIRPORT, () =>
                HttpResponse.json(nearestAirportEnvelopeFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useNearestAirport());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            iataCode: 'PTY',
            city: 'Panama City',
            countryCode: 'PA',
            distanceKm: 24.6,
        });
    });

    it('returns null when the backend has no airport for the user', async () => {
        server.use(
            http.get(AIRPORT, () => HttpResponse.json({ airport: null }))
        );
        const { result } = renderHookWithProviders(() => useNearestAirport());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('is disabled when the user has no home coordinates (no request)', () => {
        mockUser = { id: 'u1', homeLatitude: null, homeLongitude: null };
        const { result } = renderHookWithProviders(() => useNearestAirport());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled when logged out (no request)', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useNearestAirport());
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(AIRPORT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useNearestAirport());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useNearestTrainStation', () => {
    it('fetches + reshapes the station envelope when coords are set', async () => {
        server.use(
            http.get(STATION, () =>
                HttpResponse.json(nearestStationEnvelopeFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useNearestTrainStation()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            code: 'PACIF',
            city: 'Panama City',
            distanceKm: 5.1,
        });
    });

    it('returns null when the station dataset has no match', async () => {
        server.use(
            http.get(STATION, () => HttpResponse.json({ station: null }))
        );
        const { result } = renderHookWithProviders(() =>
            useNearestTrainStation()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('is disabled when the user has no home coordinates (no request)', () => {
        mockUser = { id: 'u1', homeLatitude: null, homeLongitude: null };
        const { result } = renderHookWithProviders(() =>
            useNearestTrainStation()
        );
        expect(result.current.fetchStatus).toBe('idle');
    });
});
