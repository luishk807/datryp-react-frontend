import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { PlaceRatingWireContract } from '../test/contracts/placeRating.contract';
import {
    placeRatingWireFixture,
    placeRatingResultWireFixture,
    placeRatingNoMatchWireFixture,
} from '../test/fixtures/placeRating';
import { fetchPlaceRating } from './placeRatingApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/places/rating`;

// Contract tests for the REST /places/rating boundary: drive the REAL client
// through MSW so request-building (field-mask, bearer token), the envelope
// unwrap, and the snake→camel reshape are all exercised.
describe('placeRatingApi contract — GET /places/rating', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('both fixtures satisfy the wire contract', () => {
        expect(() =>
            PlaceRatingWireContract.parse(placeRatingWireFixture)
        ).not.toThrow();
        expect(() =>
            PlaceRatingWireContract.parse(placeRatingNoMatchWireFixture)
        ).not.toThrow();
    });

    it('returns null and makes NO request for a blank name', async () => {
        const handler = vi.fn(() => HttpResponse.json(placeRatingWireFixture));
        server.use(http.get(url, handler));
        expect(await fetchPlaceRating('   ')).toBeNull();
        expect(handler).not.toHaveBeenCalled();
    });

    it('reshapes a full result and defaults fields to "all"', async () => {
        let params: URLSearchParams | null = null;
        let authHeader: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                params = new URL(request.url).searchParams;
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(placeRatingWireFixture);
            })
        );
        const result = await fetchPlaceRating('  Eiffel Tower ');
        expect(params!.get('name')).toBe('Eiffel Tower');
        expect(params!.get('fields')).toBe('all');
        expect(params!.has('location')).toBe(false);
        expect(authHeader).toBe('Bearer test-token');
        expect(result).toEqual({
            placeId: placeRatingResultWireFixture.place_id,
            name: 'Eiffel Tower',
            rating: 4.7,
            userRatingCount: 289456,
            googleMapsUri: placeRatingResultWireFixture.google_maps_uri,
            formattedAddress: placeRatingResultWireFixture.formatted_address,
            latitude: 48.8583701,
            longitude: 2.2944813,
            photoUrl: placeRatingResultWireFixture.photo_url,
        });
    });

    it('forwards the field-mask and trimmed location when provided', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(url, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(placeRatingWireFixture);
            })
        );
        await fetchPlaceRating('Eiffel Tower', '  Paris, France ', 'rating');
        expect(params!.get('fields')).toBe('rating');
        expect(params!.get('location')).toBe('Paris, France');
    });

    it('omits the Authorization header for an anonymous caller', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(placeRatingWireFixture);
            })
        );
        await fetchPlaceRating('Eiffel Tower');
        expect(authHeader).toBeNull();
    });

    it('maps an empty { result: null } envelope to null', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json(placeRatingNoMatchWireFixture)
            )
        );
        expect(await fetchPlaceRating('Unknown Place')).toBeNull();
    });

    it('returns null on a non-OK response (missing key / non-Pro)', async () => {
        server.use(
            http.get(url, () => new HttpResponse(null, { status: 503 }))
        );
        expect(await fetchPlaceRating('Eiffel Tower')).toBeNull();
    });

    it('contract catches drift (missing result / extra / wrong-typed)', () => {
        expect(() => PlaceRatingWireContract.parse({})).toThrow();
        expect(() =>
            PlaceRatingWireContract.parse({
                ...placeRatingWireFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            PlaceRatingWireContract.parse({
                result: { ...placeRatingResultWireFixture, rating: '4.7' },
            })
        ).toThrow();
    });
});
