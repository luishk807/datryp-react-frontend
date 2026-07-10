import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    nearestAirportEnvelopeFixture,
    nearestStationEnvelopeFixture,
} from 'test/fixtures/homeDeparture';
import {
    NearestAirportEnvelopeContract,
    NearestStationEnvelopeContract,
} from 'test/contracts/homeDeparture.contract';
import {
    fetchNearestAirport,
    fetchNearestAirportForCoords,
    fetchNearestTrainStation,
} from './homeDepartureApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';

const expectedAirport = {
    iataCode: 'PTY',
    name: 'Tocumen International Airport',
    city: 'Panama City',
    country: 'Panama',
    countryCode: 'PA',
    latitude: 9.0714,
    longitude: -79.3835,
    distanceKm: 24.6,
};

// Contract tests for the three "nearest departure" wrappers: null-body envelope
// → null result, snake→camel reshape, and thrown Error on non-OK.
describe('homeDepartureApi contract — nearest airport / station', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('envelope fixtures satisfy the contracts (populated + null body)', () => {
        expect(() =>
            NearestAirportEnvelopeContract.parse(nearestAirportEnvelopeFixture)
        ).not.toThrow();
        expect(() =>
            NearestStationEnvelopeContract.parse(nearestStationEnvelopeFixture)
        ).not.toThrow();
        expect(() =>
            NearestAirportEnvelopeContract.parse({ airport: null })
        ).not.toThrow();
        expect(() =>
            NearestStationEnvelopeContract.parse({ station: null })
        ).not.toThrow();
    });

    // ── fetchNearestAirport ──
    it('fetchNearestAirport reshapes the airport + sends bearer', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(`${API_BASE}/me/nearest-airport`, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(nearestAirportEnvelopeFixture);
            })
        );
        const result = await fetchNearestAirport();
        expect(authHeader).toBe('Bearer test-token');
        expect(result).toEqual(expectedAirport);
    });

    it('fetchNearestAirport returns null when the airport body is null', async () => {
        server.use(
            http.get(`${API_BASE}/me/nearest-airport`, () =>
                HttpResponse.json({ airport: null })
            )
        );
        expect(await fetchNearestAirport()).toBeNull();
    });

    it('fetchNearestAirport throws on a non-OK response', async () => {
        server.use(
            http.get(
                `${API_BASE}/me/nearest-airport`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        await expect(fetchNearestAirport()).rejects.toThrow(
            '/me/nearest-airport 500'
        );
    });

    // ── fetchNearestAirportForCoords ──
    it('fetchNearestAirportForCoords forwards lat/lng and reshapes', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(`${API_BASE}/airports/nearest`, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(nearestAirportEnvelopeFixture);
            })
        );
        const result = await fetchNearestAirportForCoords(8.98, -79.52);
        expect(params!.get('lat')).toBe('8.98');
        expect(params!.get('lng')).toBe('-79.52');
        expect(result).toEqual(expectedAirport);
    });

    it('fetchNearestAirportForCoords returns null when the airport body is null', async () => {
        server.use(
            http.get(`${API_BASE}/airports/nearest`, () =>
                HttpResponse.json({ airport: null })
            )
        );
        expect(await fetchNearestAirportForCoords(0, 0)).toBeNull();
    });

    it('fetchNearestAirportForCoords throws on a non-OK response', async () => {
        server.use(
            http.get(
                `${API_BASE}/airports/nearest`,
                () => new HttpResponse(null, { status: 502 })
            )
        );
        await expect(fetchNearestAirportForCoords(0, 0)).rejects.toThrow(
            '/airports/nearest 502'
        );
    });

    // ── fetchNearestTrainStation ──
    it('fetchNearestTrainStation reshapes the station', async () => {
        server.use(
            http.get(`${API_BASE}/me/nearest-train-station`, () =>
                HttpResponse.json(nearestStationEnvelopeFixture)
            )
        );
        expect(await fetchNearestTrainStation()).toEqual({
            code: 'PACIF',
            name: 'Panama Canal Railway Station',
            city: 'Panama City',
            country: 'Panama',
            countryCode: 'PA',
            latitude: 8.9536,
            longitude: -79.5637,
            distanceKm: 5.1,
        });
    });

    it('fetchNearestTrainStation tolerates a null station code', async () => {
        server.use(
            http.get(`${API_BASE}/me/nearest-train-station`, () =>
                HttpResponse.json({
                    station: {
                        ...nearestStationEnvelopeFixture.station,
                        code: null,
                    },
                })
            )
        );
        const result = await fetchNearestTrainStation();
        expect(result?.code).toBeNull();
    });

    it('fetchNearestTrainStation returns null when the station body is null', async () => {
        server.use(
            http.get(`${API_BASE}/me/nearest-train-station`, () =>
                HttpResponse.json({ station: null })
            )
        );
        expect(await fetchNearestTrainStation()).toBeNull();
    });

    it('fetchNearestTrainStation throws on a non-OK response', async () => {
        server.use(
            http.get(
                `${API_BASE}/me/nearest-train-station`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        await expect(fetchNearestTrainStation()).rejects.toThrow(
            '/me/nearest-train-station 500'
        );
    });

    it('contracts catch drift (extra field / wrong-typed)', () => {
        expect(() =>
            NearestAirportEnvelopeContract.parse({
                airport: { ...nearestAirportEnvelopeFixture.airport, extra: 1 },
            })
        ).toThrow();
        expect(() =>
            NearestAirportEnvelopeContract.parse({
                airport: {
                    ...nearestAirportEnvelopeFixture.airport,
                    distance_km: '24.6',
                },
            })
        ).toThrow();
        expect(() =>
            NearestStationEnvelopeContract.parse({
                station: {
                    ...nearestStationEnvelopeFixture.station,
                    latitude: null,
                },
            })
        ).toThrow();
    });
});
