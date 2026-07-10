import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    visitedPlaceFixture,
    visitedPlaceWire,
    visitedPlacesResponseWire,
} from '../test/fixtures/visitedPlaces';
import {
    VisitedPlaceContract,
    VisitedPlacesResponseContract,
} from '../test/contracts/visitedPlaces.contract';
import { fetchVisited, markVisited, unmarkVisited } from './visitedPlacesApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const LIST_URL = `${API_BASE}/me/visited`;

describe('visitedPlacesApi contract — GET /me/visited', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fetchVisited reshapes both trip-bearing and legacy (no-trips) items', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json(visitedPlacesResponseWire)
            )
        );
        const res = await fetchVisited();
        expect(() => VisitedPlacesResponseContract.parse(res)).not.toThrow();
        expect(res.total).toBe(2);
        expect(res.items[0]).toEqual(visitedPlaceFixture);
        // Legacy row without a `trips` key defaults to an empty array.
        expect(res.items[1].trips).toEqual([]);
    });

    it('sends the stored bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(visitedPlacesResponseWire);
            })
        );
        await fetchVisited();
        expect(authHeader).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let hasAuth = true;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                hasAuth = request.headers.has('authorization');
                return HttpResponse.json(visitedPlacesResponseWire);
            })
        );
        await fetchVisited();
        expect(hasAuth).toBe(false);
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json({ detail: 'nope' }, { status: 403 })
            )
        );
        await expect(fetchVisited()).rejects.toThrow(/nope/);
    });

    it('throws without a detail when the error body is not JSON', async () => {
        server.use(
            http.get(
                LIST_URL,
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(fetchVisited()).rejects.toThrow(/500/);
    });
});

describe('visitedPlacesApi contract — POST /me/visited', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('markVisited sends snake_case body and returns a contract item', async () => {
        let body: unknown;
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(visitedPlaceWire);
            })
        );
        const res = await markVisited({
            placeName: 'Colosseum',
            placeCity: 'Rome',
            placeCountry: 'Italy',
            countryCode: 'IT',
            latitude: 41.8902,
            longitude: 12.4922,
        });
        expect(() => VisitedPlaceContract.parse(res)).not.toThrow();
        expect(res).toEqual(visitedPlaceFixture);
        expect(body).toEqual({
            place_name: 'Colosseum',
            place_city: 'Rome',
            place_country: 'Italy',
            country_code: 'IT',
            latitude: 41.8902,
            longitude: 12.4922,
        });
    });

    it('nulls optional fields absent from the payload', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(visitedPlaceWire);
            })
        );
        await markVisited({
            placeName: 'X',
            placeCity: 'Y',
            placeCountry: 'Z',
        });
        expect(body.country_code).toBeNull();
        expect(body.latitude).toBeNull();
        expect(body.longitude).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json({ detail: 'dupe' }, { status: 409 })
            )
        );
        await expect(
            markVisited({ placeName: 'X', placeCity: 'Y', placeCountry: 'Z' })
        ).rejects.toThrow(/dupe/);
    });
});

describe('visitedPlacesApi contract — DELETE /me/visited/:key', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('unmarkVisited URL-encodes the key and issues a DELETE', async () => {
        let method: string | undefined;
        let path: string | undefined;
        server.use(
            http.delete(`${API_BASE}/me/visited/:key`, ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                return new HttpResponse(null, { status: 204 });
            })
        );
        await unmarkVisited('colosseum/rome');
        expect(method).toBe('DELETE');
        expect(path).toBe('/me/visited/colosseum%2Frome');
    });

    it('throws on a non-OK delete', async () => {
        server.use(
            http.delete(
                `${API_BASE}/me/visited/:key`,
                () => new HttpResponse(null, { status: 404 })
            )
        );
        await expect(unmarkVisited('missing')).rejects.toThrow(
            /unmark visited/
        );
    });
});

describe('visitedPlacesApi contract — Zod drift guards', () => {
    it('catches a MISSING required field', () => {
        const missing = { ...visitedPlaceFixture } as Record<string, unknown>;
        delete missing.placeKey;
        expect(() => VisitedPlaceContract.parse(missing)).toThrow();
    });

    it('catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            VisitedPlaceContract.parse({
                ...visitedPlaceFixture,
                surprise: true,
            })
        ).toThrow();
    });

    it('catches a WRONG-typed field (string where number|null latitude)', () => {
        expect(() =>
            VisitedPlaceContract.parse({
                ...visitedPlaceFixture,
                latitude: 'x',
            })
        ).toThrow();
    });

    it('catches drift inside a nested trip', () => {
        expect(() =>
            VisitedPlaceContract.parse({
                ...visitedPlaceFixture,
                trips: [{ tripId: 't', tripName: null }],
            })
        ).toThrow();
    });
});
