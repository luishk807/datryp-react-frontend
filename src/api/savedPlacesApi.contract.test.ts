import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    savedPlaceFixture,
    savedPlaceWire,
    savedPlacesResponseWire,
} from '../test/fixtures/savedPlaces';
import {
    SavedPlaceContract,
    SavedPlacesResponseContract,
} from '../test/contracts/savedPlaces.contract';
import { fetchSavedPlaces, savePlace, unsavePlace } from './savedPlacesApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const LIST_URL = `${API_BASE}/me/saved/places`;

// Contract tests for the saved-places REST boundary: drive the REAL client
// functions through MSW (request-building + snake→camel reshaping exercised)
// and validate the returned payloads against the Zod contracts.
describe('savedPlacesApi contract — GET /me/saved/places', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fetchSavedPlaces reshapes the wire payload to the FE contract', async () => {
        server.use(
            http.get(LIST_URL, () => HttpResponse.json(savedPlacesResponseWire))
        );
        const res = await fetchSavedPlaces();
        expect(() => SavedPlacesResponseContract.parse(res)).not.toThrow();
        expect(res.total).toBe(1);
        expect(res.items[0]).toEqual(savedPlaceFixture);
    });

    it('sends the stored bearer token in the Authorization header', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(savedPlacesResponseWire);
            })
        );
        await fetchSavedPlaces();
        expect(authHeader).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let hasAuth = true;
        server.use(
            http.get(LIST_URL, ({ request }) => {
                hasAuth = request.headers.has('authorization');
                return HttpResponse.json(savedPlacesResponseWire);
            })
        );
        await fetchSavedPlaces();
        expect(hasAuth).toBe(false);
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(LIST_URL, () =>
                HttpResponse.json({ detail: 'nope' }, { status: 403 })
            )
        );
        await expect(fetchSavedPlaces()).rejects.toThrow(/nope/);
    });

    it('throws without a detail when the error body is not JSON', async () => {
        server.use(
            http.get(
                LIST_URL,
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(fetchSavedPlaces()).rejects.toThrow(/500/);
    });
});

describe('savedPlacesApi contract — POST /me/saved/places', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('savePlace sends snake_case body and returns a contract item', async () => {
        let body: unknown;
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(savedPlaceWire);
            })
        );
        const res = await savePlace({
            placeName: 'Eiffel Tower',
            placeCity: 'Paris',
            placeCountry: 'France',
            countryCode: 'FR',
            imageUrl: 'https://img.example/eiffel.jpg',
            searchQuery: 'paris landmarks',
            searchIndex: 2,
        });
        expect(() => SavedPlaceContract.parse(res)).not.toThrow();
        expect(res).toEqual(savedPlaceFixture);
        expect(body).toEqual({
            place_name: 'Eiffel Tower',
            place_city: 'Paris',
            place_country: 'France',
            country_code: 'FR',
            image_url: 'https://img.example/eiffel.jpg',
            search_query: 'paris landmarks',
            search_index: 2,
        });
    });

    it('nulls optional fields absent from the payload', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(LIST_URL, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(savedPlaceWire);
            })
        );
        await savePlace({
            placeName: 'X',
            placeCity: 'Y',
            placeCountry: 'Z',
        });
        expect(body.country_code).toBeNull();
        expect(body.image_url).toBeNull();
        expect(body.search_query).toBeNull();
        expect(body.search_index).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.post(LIST_URL, () =>
                HttpResponse.json({ detail: 'dupe' }, { status: 409 })
            )
        );
        await expect(
            savePlace({ placeName: 'X', placeCity: 'Y', placeCountry: 'Z' })
        ).rejects.toThrow(/dupe/);
    });
});

describe('savedPlacesApi contract — DELETE /me/saved/places/:key', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('unsavePlace URL-encodes the key and issues a DELETE', async () => {
        let method: string | undefined;
        let path: string | undefined;
        server.use(
            http.delete(
                `${API_BASE}/me/saved/places/:key`,
                ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    return new HttpResponse(null, { status: 204 });
                }
            )
        );
        await unsavePlace('eiffel/tower');
        expect(method).toBe('DELETE');
        expect(path).toBe('/me/saved/places/eiffel%2Ftower');
    });

    it('throws on a non-OK delete', async () => {
        server.use(
            http.delete(
                `${API_BASE}/me/saved/places/:key`,
                () => new HttpResponse(null, { status: 404 })
            )
        );
        await expect(unsavePlace('missing')).rejects.toThrow(/unsave place/);
    });
});

describe('savedPlacesApi contract — Zod drift guards', () => {
    it('catches a MISSING required field', () => {
        const missing = { ...savedPlaceFixture } as Record<string, unknown>;
        delete missing.placeName;
        expect(() => SavedPlaceContract.parse(missing)).toThrow();
    });

    it('catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            SavedPlaceContract.parse({ ...savedPlaceFixture, surprise: true })
        ).toThrow();
    });

    it('catches a WRONG-typed field (string where number|null)', () => {
        expect(() =>
            SavedPlaceContract.parse({ ...savedPlaceFixture, searchIndex: 'x' })
        ).toThrow();
    });

    it('catches drift in the response envelope (wrong-typed total)', () => {
        expect(() =>
            SavedPlacesResponseContract.parse({
                items: [savedPlaceFixture],
                total: 'one',
            })
        ).toThrow();
    });
});
