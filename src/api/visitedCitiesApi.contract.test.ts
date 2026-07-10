import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    visitedCityFixture,
    visitedCityWire,
    visitedCitiesResponseWire,
} from '../test/fixtures/visitedCities';
import {
    VisitedCityContract,
    VisitedCitiesResponseContract,
} from '../test/contracts/visitedCities.contract';
import {
    fetchVisitedCities,
    markVisitedCity,
    unmarkVisitedCity,
} from './visitedCitiesApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const LIST_URL = `${API_BASE}/me/visited-cities`;

describe('visitedCitiesApi contract — GET /me/visited-cities', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fetchVisitedCities reshapes rows with and without coordinates', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json(visitedCitiesResponseWire)
            )
        );
        const res = await fetchVisitedCities();
        expect(() => VisitedCitiesResponseContract.parse(res)).not.toThrow();
        expect(res.total).toBe(2);
        expect(res.items[0]).toEqual(visitedCityFixture);
        // Null-coord row keeps latitude/longitude as null (the `?? null` fallback).
        expect(res.items[1].latitude).toBeNull();
        expect(res.items[1].longitude).toBeNull();
    });

    it('sends the stored bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(visitedCitiesResponseWire);
            })
        );
        await fetchVisitedCities();
        expect(authHeader).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let hasAuth = true;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                hasAuth = request.headers.has('authorization');
                return HttpResponse.json(visitedCitiesResponseWire);
            })
        );
        await fetchVisitedCities();
        expect(hasAuth).toBe(false);
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json({ detail: 'nope' }, { status: 403 })
            )
        );
        await expect(fetchVisitedCities()).rejects.toThrow(/nope/);
    });

    it('throws without a detail when the error body is not JSON', async () => {
        server.use(
            http.get(
                LIST_URL,
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(fetchVisitedCities()).rejects.toThrow(/500/);
    });
});

describe('visitedCitiesApi contract — POST /me/visited-cities', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('markVisitedCity sends { name, country, code } and returns a contract item', async () => {
        let body: unknown;
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(visitedCityWire);
            })
        );
        const res = await markVisitedCity({
            name: 'Rome',
            country: 'Italy',
            code: 'IT',
        });
        expect(() => VisitedCityContract.parse(res)).not.toThrow();
        expect(res).toEqual(visitedCityFixture);
        expect(body).toEqual({ name: 'Rome', country: 'Italy', code: 'IT' });
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json({ detail: 'dupe' }, { status: 409 })
            )
        );
        await expect(
            markVisitedCity({ name: 'R', country: 'I', code: 'IT' })
        ).rejects.toThrow(/dupe/);
    });
});

describe('visitedCitiesApi contract — DELETE /me/visited-cities/:slug', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('unmarkVisitedCity URL-encodes the slug and issues a DELETE', async () => {
        let method: string | undefined;
        let path: string | undefined;
        server.use(
            http.delete(
                `${API_BASE}/me/visited-cities/:slug`,
                ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    return new HttpResponse(null, { status: 204 });
                }
            )
        );
        await unmarkVisitedCity('rome/it');
        expect(method).toBe('DELETE');
        expect(path).toBe('/me/visited-cities/rome%2Fit');
    });

    it('throws on a non-OK delete', async () => {
        server.use(
            http.delete(
                `${API_BASE}/me/visited-cities/:slug`,
                () => new HttpResponse(null, { status: 404 })
            )
        );
        await expect(unmarkVisitedCity('missing')).rejects.toThrow(
            /unmark city visited/
        );
    });
});

describe('visitedCitiesApi contract — Zod drift guards', () => {
    it('catches a MISSING required field', () => {
        const missing = { ...visitedCityFixture } as Record<string, unknown>;
        delete missing.citySlug;
        expect(() => VisitedCityContract.parse(missing)).toThrow();
    });

    it('catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            VisitedCityContract.parse({
                ...visitedCityFixture,
                surprise: true,
            })
        ).toThrow();
    });

    it('catches a WRONG-typed field (string where number|null longitude)', () => {
        expect(() =>
            VisitedCityContract.parse({
                ...visitedCityFixture,
                longitude: 'x',
            })
        ).toThrow();
    });
});
