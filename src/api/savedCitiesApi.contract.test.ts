import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    savedCityFixture,
    savedCityWire,
    savedCitiesResponseWire,
} from '../test/fixtures/savedCities';
import {
    SavedCityContract,
    SavedCitiesResponseContract,
} from '../test/contracts/savedCities.contract';
import { fetchSavedCities, saveCity, unsaveCity } from './savedCitiesApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const LIST_URL = `${API_BASE}/me/saved/cities`;

describe('savedCitiesApi contract — GET /me/saved/cities', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fetchSavedCities reshapes the wire payload to the FE contract', async () => {
        server.use(
            http.get(LIST_URL, () => HttpResponse.json(savedCitiesResponseWire))
        );
        const res = await fetchSavedCities();
        expect(() => SavedCitiesResponseContract.parse(res)).not.toThrow();
        expect(res.total).toBe(1);
        expect(res.items[0]).toEqual(savedCityFixture);
    });

    it('sends the stored bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(savedCitiesResponseWire);
            })
        );
        await fetchSavedCities();
        expect(authHeader).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let hasAuth = true;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                hasAuth = request.headers.has('authorization');
                return HttpResponse.json(savedCitiesResponseWire);
            })
        );
        await fetchSavedCities();
        expect(hasAuth).toBe(false);
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json({ detail: 'nope' }, { status: 403 })
            )
        );
        await expect(fetchSavedCities()).rejects.toThrow(/nope/);
    });

    it('throws without a detail when the error body is not JSON', async () => {
        server.use(
            http.get(
                LIST_URL,
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(fetchSavedCities()).rejects.toThrow(/500/);
    });
});

describe('savedCitiesApi contract — POST /me/saved/cities', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('saveCity sends snake_case body and returns a contract item', async () => {
        let body: unknown;
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(savedCityWire);
            })
        );
        const res = await saveCity({
            name: 'Kyoto',
            country: 'Japan',
            code: 'JP',
            imageUrl: 'https://img.example/kyoto.jpg',
        });
        expect(() => SavedCityContract.parse(res)).not.toThrow();
        expect(res).toEqual(savedCityFixture);
        expect(body).toEqual({
            name: 'Kyoto',
            country: 'Japan',
            code: 'JP',
            image_url: 'https://img.example/kyoto.jpg',
        });
    });

    it('nulls image_url when omitted from the payload', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(savedCityWire);
            })
        );
        await saveCity({ name: 'Kyoto', country: 'Japan', code: 'JP' });
        expect(body.image_url).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json({ detail: 'dupe' }, { status: 409 })
            )
        );
        await expect(
            saveCity({ name: 'K', country: 'J', code: 'JP' })
        ).rejects.toThrow(/dupe/);
    });
});

describe('savedCitiesApi contract — DELETE /me/saved/cities/:slug', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('unsaveCity URL-encodes the slug and issues a DELETE', async () => {
        let method: string | undefined;
        let path: string | undefined;
        server.use(
            http.delete(
                `${API_BASE}/me/saved/cities/:slug`,
                ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    return new HttpResponse(null, { status: 204 });
                }
            )
        );
        await unsaveCity('kyoto/jp');
        expect(method).toBe('DELETE');
        expect(path).toBe('/me/saved/cities/kyoto%2Fjp');
    });

    it('throws on a non-OK delete', async () => {
        server.use(
            http.delete(
                `${API_BASE}/me/saved/cities/:slug`,
                () => new HttpResponse(null, { status: 404 })
            )
        );
        await expect(unsaveCity('missing')).rejects.toThrow(/unsave city/);
    });
});

describe('savedCitiesApi contract — Zod drift guards', () => {
    it('catches a MISSING required field', () => {
        const missing = { ...savedCityFixture } as Record<string, unknown>;
        delete missing.cityName;
        expect(() => SavedCityContract.parse(missing)).toThrow();
    });

    it('catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            SavedCityContract.parse({ ...savedCityFixture, surprise: true })
        ).toThrow();
    });

    it('catches a WRONG-typed field (number where string countryCode)', () => {
        expect(() =>
            SavedCityContract.parse({ ...savedCityFixture, countryCode: 7 })
        ).toThrow();
    });
});
