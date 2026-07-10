import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    visitedCountryFixture,
    visitedCountryWire,
    visitedCountriesResponseWire,
} from '../test/fixtures/visitedCountries';
import {
    VisitedCountryContract,
    VisitedCountriesResponseContract,
} from '../test/contracts/visitedCountries.contract';
import {
    fetchVisitedCountries,
    markVisitedCountry,
    unmarkVisitedCountry,
} from './visitedCountriesApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const LIST_URL = `${API_BASE}/me/visited-countries`;

describe('visitedCountriesApi contract — GET /me/visited-countries', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fetchVisitedCountries reshapes the wire payload to the FE contract', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json(visitedCountriesResponseWire)
            )
        );
        const res = await fetchVisitedCountries();
        expect(() =>
            VisitedCountriesResponseContract.parse(res)
        ).not.toThrow();
        expect(res.total).toBe(1);
        expect(res.items[0]).toEqual(visitedCountryFixture);
    });

    it('sends the stored bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(visitedCountriesResponseWire);
            })
        );
        await fetchVisitedCountries();
        expect(authHeader).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let hasAuth = true;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                hasAuth = request.headers.has('authorization');
                return HttpResponse.json(visitedCountriesResponseWire);
            })
        );
        await fetchVisitedCountries();
        expect(hasAuth).toBe(false);
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json({ detail: 'nope' }, { status: 403 })
            )
        );
        await expect(fetchVisitedCountries()).rejects.toThrow(/nope/);
    });

    it('throws without a detail when the error body is not JSON', async () => {
        server.use(
            http.get(
                LIST_URL,
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(fetchVisitedCountries()).rejects.toThrow(/500/);
    });
});

describe('visitedCountriesApi contract — POST /me/visited-countries', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('markVisitedCountry sends { code } and returns a contract item', async () => {
        let body: unknown;
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(visitedCountryWire);
            })
        );
        const res = await markVisitedCountry('IT');
        expect(() => VisitedCountryContract.parse(res)).not.toThrow();
        expect(res).toEqual(visitedCountryFixture);
        expect(body).toEqual({ code: 'IT' });
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json({ detail: 'dupe' }, { status: 409 })
            )
        );
        await expect(markVisitedCountry('IT')).rejects.toThrow(/dupe/);
    });
});

describe('visitedCountriesApi contract — DELETE /me/visited-countries/:code', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('unmarkVisitedCountry URL-encodes the code and issues a DELETE', async () => {
        let method: string | undefined;
        let path: string | undefined;
        server.use(
            http.delete(
                `${API_BASE}/me/visited-countries/:code`,
                ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    return new HttpResponse(null, { status: 204 });
                }
            )
        );
        await unmarkVisitedCountry('I T');
        expect(method).toBe('DELETE');
        expect(path).toBe('/me/visited-countries/I%20T');
    });

    it('throws on a non-OK delete', async () => {
        server.use(
            http.delete(
                `${API_BASE}/me/visited-countries/:code`,
                () => new HttpResponse(null, { status: 404 })
            )
        );
        await expect(unmarkVisitedCountry('ZZ')).rejects.toThrow(
            /unmark country visited/
        );
    });
});

describe('visitedCountriesApi contract — Zod drift guards', () => {
    it('catches a MISSING required field', () => {
        const missing = { ...visitedCountryFixture } as Record<
            string,
            unknown
        >;
        delete missing.countryId;
        expect(() => VisitedCountryContract.parse(missing)).toThrow();
    });

    it('catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            VisitedCountryContract.parse({
                ...visitedCountryFixture,
                surprise: true,
            })
        ).toThrow();
    });

    it('catches a WRONG-typed field (number where string|null countryImage)', () => {
        expect(() =>
            VisitedCountryContract.parse({
                ...visitedCountryFixture,
                countryImage: 7,
            })
        ).toThrow();
    });
});
