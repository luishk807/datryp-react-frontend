import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    savedCountryFixture,
    savedCountryWire,
    savedCountriesResponseWire,
} from '../test/fixtures/savedCountries';
import {
    SavedCountryContract,
    SavedCountriesResponseContract,
} from '../test/contracts/savedCountries.contract';
import {
    fetchSavedCountries,
    saveCountry,
    unsaveCountry,
} from './savedCountriesApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const LIST_URL = `${API_BASE}/me/saved/countries`;

describe('savedCountriesApi contract — GET /me/saved/countries', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fetchSavedCountries reshapes the wire payload to the FE contract', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json(savedCountriesResponseWire)
            )
        );
        const res = await fetchSavedCountries();
        expect(() => SavedCountriesResponseContract.parse(res)).not.toThrow();
        expect(res.total).toBe(1);
        expect(res.items[0]).toEqual(savedCountryFixture);
    });

    it('sends the stored bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(savedCountriesResponseWire);
            })
        );
        await fetchSavedCountries();
        expect(authHeader).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let hasAuth = true;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                hasAuth = request.headers.has('authorization');
                return HttpResponse.json(savedCountriesResponseWire);
            })
        );
        await fetchSavedCountries();
        expect(hasAuth).toBe(false);
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json({ detail: 'nope' }, { status: 403 })
            )
        );
        await expect(fetchSavedCountries()).rejects.toThrow(/nope/);
    });

    it('throws without a detail when the error body is not JSON', async () => {
        server.use(
            http.get(
                LIST_URL,
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(fetchSavedCountries()).rejects.toThrow(/500/);
    });
});

describe('savedCountriesApi contract — POST /me/saved/countries', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('saveCountry sends { code } and returns a contract item', async () => {
        let body: unknown;
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(savedCountryWire);
            })
        );
        const res = await saveCountry('JP');
        expect(() => SavedCountryContract.parse(res)).not.toThrow();
        expect(res).toEqual(savedCountryFixture);
        expect(body).toEqual({ code: 'JP' });
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json({ detail: 'dupe' }, { status: 409 })
            )
        );
        await expect(saveCountry('JP')).rejects.toThrow(/dupe/);
    });
});

describe('savedCountriesApi contract — DELETE /me/saved/countries/:code', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('unsaveCountry URL-encodes the code and issues a DELETE', async () => {
        let method: string | undefined;
        let path: string | undefined;
        server.use(
            http.delete(
                `${API_BASE}/me/saved/countries/:code`,
                ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    return new HttpResponse(null, { status: 204 });
                }
            )
        );
        await unsaveCountry('J P');
        expect(method).toBe('DELETE');
        expect(path).toBe('/me/saved/countries/J%20P');
    });

    it('throws on a non-OK delete', async () => {
        server.use(
            http.delete(
                `${API_BASE}/me/saved/countries/:code`,
                () => new HttpResponse(null, { status: 404 })
            )
        );
        await expect(unsaveCountry('ZZ')).rejects.toThrow(/unsave country/);
    });
});

describe('savedCountriesApi contract — Zod drift guards', () => {
    it('catches a MISSING required field', () => {
        const missing = { ...savedCountryFixture } as Record<string, unknown>;
        delete missing.countryId;
        expect(() => SavedCountryContract.parse(missing)).toThrow();
    });

    it('catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            SavedCountryContract.parse({
                ...savedCountryFixture,
                surprise: true,
            })
        ).toThrow();
    });

    it('catches a WRONG-typed field (number where string|null countryImage)', () => {
        expect(() =>
            SavedCountryContract.parse({
                ...savedCountryFixture,
                countryImage: 7,
            })
        ).toThrow();
    });
});
