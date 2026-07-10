import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { SeasonalBestPlacesWireContract } from '../test/contracts/seasonalBestPlaces.contract';
import { seasonalBestPlacesWireFixture } from '../test/fixtures/seasonalBestPlaces';
import { fetchSeasonalBestPlaces } from './seasonalBestPlacesApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/seasonal-best-places`;

// Contract tests for the Pro seasonal strip boundary: drive the REAL client
// through MSW so the optional bearer token, the per-place snake→camel reshape,
// and the error branch are exercised.
describe('seasonalBestPlacesApi contract — GET /seasonal-best-places', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixture satisfies the wire contract', () => {
        expect(() =>
            SeasonalBestPlacesWireContract.parse(seasonalBestPlacesWireFixture)
        ).not.toThrow();
    });

    it('reshapes places, preserves cached, and sends the bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(seasonalBestPlacesWireFixture);
            })
        );
        const result = await fetchSeasonalBestPlaces();
        expect(authHeader).toBe('Bearer test-token');
        expect(result.monthKey).toBe('2026-07');
        expect(result.cached).toBe(true);
        expect(result.places).toHaveLength(2);
        expect(result.places[0]).toEqual({
            name: 'Reykjavik',
            country: 'Iceland',
            countryCode: 'IS',
            why: seasonalBestPlacesWireFixture.places[0].why,
            imageUrl: seasonalBestPlacesWireFixture.places[0].image_url,
            photographerName:
                seasonalBestPlacesWireFixture.places[0].photographer_name,
            photographerUrl:
                seasonalBestPlacesWireFixture.places[0].photographer_url,
        });
        expect(result.places[1].imageUrl).toBeNull();
    });

    it('omits the Authorization header when signed out', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(seasonalBestPlacesWireFixture);
            })
        );
        await fetchSeasonalBestPlaces();
        expect(authHeader).toBeNull();
    });

    it('passes an empty places list straight through', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json({
                    ...seasonalBestPlacesWireFixture,
                    places: [],
                })
            )
        );
        const result = await fetchSeasonalBestPlaces();
        expect(result.places).toEqual([]);
    });

    it('throws a descriptive error on a non-OK response', async () => {
        server.use(
            http.get(url, () => new HttpResponse(null, { status: 500 }))
        );
        await expect(fetchSeasonalBestPlaces()).rejects.toThrow(
            /\/seasonal-best-places failed: 500/
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = {
            ...seasonalBestPlacesWireFixture,
        } as Record<string, unknown>;
        delete missing.month_key;
        expect(() =>
            SeasonalBestPlacesWireContract.parse(missing)
        ).toThrow();
        expect(() =>
            SeasonalBestPlacesWireContract.parse({
                ...seasonalBestPlacesWireFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            SeasonalBestPlacesWireContract.parse({
                ...seasonalBestPlacesWireFixture,
                cached: 'yes',
            })
        ).toThrow();
    });
});
