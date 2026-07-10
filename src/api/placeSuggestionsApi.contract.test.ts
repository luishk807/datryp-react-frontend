import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { PlaceSuggestionsWireContract } from '../test/contracts/placeSuggestions.contract';
import {
    placeSuggestionsWireFixture,
    placeSuggestionWireFixture,
} from '../test/fixtures/placeSuggestions';
import { fetchPlaceSuggestions } from './placeSuggestionsApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/me/place-suggestions`;

// Contract tests for the REST /me/place-suggestions boundary: drive the REAL
// client through MSW so the lang param, bearer token, item reshape, and the
// `?? null` coordinate fallback are all exercised.
describe('placeSuggestionsApi contract — GET /me/place-suggestions', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixture satisfies the wire contract', () => {
        expect(() =>
            PlaceSuggestionsWireContract.parse(placeSuggestionsWireFixture)
        ).not.toThrow();
    });

    it('reshapes items, forwards the lang param and bearer token (default en)', async () => {
        let params: URLSearchParams | null = null;
        let authHeader: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                params = new URL(request.url).searchParams;
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(placeSuggestionsWireFixture);
            })
        );
        const result = await fetchPlaceSuggestions();
        expect(params!.get('lang')).toBe('en');
        expect(authHeader).toBe('Bearer test-token');
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            name: 'Lisbon',
            country: 'Portugal',
            countryCode: 'PT',
            why: placeSuggestionWireFixture.why,
            imageUrl: placeSuggestionWireFixture.image_url,
            photographerName: placeSuggestionWireFixture.photographer_name,
            photographerUrl: placeSuggestionWireFixture.photographer_url,
            latitude: 38.7223,
            longitude: -9.1393,
        });
        expect(result[1].imageUrl).toBeNull();
    });

    it('forwards a custom lang param', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(url, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(placeSuggestionsWireFixture);
            })
        );
        await fetchPlaceSuggestions('es');
        expect(params!.get('lang')).toBe('es');
    });

    it('returns an empty array for an empty items list', async () => {
        server.use(http.get(url, () => HttpResponse.json({ items: [] })));
        expect(await fetchPlaceSuggestions()).toEqual([]);
    });

    it('coerces omitted coordinates to null (legacy cached picks)', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json({
                    items: [
                        {
                            name: 'Hoi An',
                            country: 'Vietnam',
                            country_code: 'VN',
                            why: 'Lantern-lit old town.',
                            image_url: null,
                            photographer_name: null,
                            photographer_url: null,
                            // latitude / longitude omitted → `?? null`
                        },
                    ],
                })
            )
        );
        const result = await fetchPlaceSuggestions();
        expect(result[0].latitude).toBeNull();
        expect(result[0].longitude).toBeNull();
    });

    it('throws with the backend detail on a non-OK JSON error', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json(
                    { detail: 'Onboarding not complete' },
                    { status: 403 }
                )
            )
        );
        await expect(fetchPlaceSuggestions()).rejects.toThrow(
            '/me/place-suggestions 403 — Onboarding not complete'
        );
    });

    it('throws a bare status message when the error body is not JSON', async () => {
        server.use(
            http.get(
                url,
                () =>
                    new HttpResponse('nope', {
                        status: 500,
                        headers: { 'content-type': 'text/plain' },
                    })
            )
        );
        await expect(fetchPlaceSuggestions()).rejects.toThrow(
            '/me/place-suggestions 500'
        );
    });

    it('omits the Authorization header when signed out', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(url, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(placeSuggestionsWireFixture);
            })
        );
        await fetchPlaceSuggestions();
        expect(authHeader).toBeNull();
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = {
            ...placeSuggestionWireFixture,
        } as Record<string, unknown>;
        delete missing.name;
        expect(() =>
            PlaceSuggestionsWireContract.parse({ items: [missing] })
        ).toThrow();
        expect(() =>
            PlaceSuggestionsWireContract.parse({
                items: [{ ...placeSuggestionWireFixture, extra: true }],
            })
        ).toThrow();
        expect(() =>
            PlaceSuggestionsWireContract.parse({
                items: [{ ...placeSuggestionWireFixture, latitude: '38.7' }],
            })
        ).toThrow();
    });
});
