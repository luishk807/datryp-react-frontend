import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { PlaceImageWireContract } from '../test/contracts/placeImage.contract';
import {
    placeImageWireFixture,
    placeImageNoCreditWireFixture,
} from '../test/fixtures/placeImage';
import { fetchPlaceImage } from './placeImageApi';

const API_BASE = 'http://localhost:8000';
// Handler matches the path only; the client appends `?name=…&city=…`, which
// MSW matches regardless of the query string.
const url = `${API_BASE}/places/image`;

// Contract tests for the REST /places/image boundary: drive the REAL client
// through MSW so request-building + snake→camel reshaping are exercised, then
// validate the wire payload against the Zod contract.
describe('placeImageApi contract — GET /places/image', () => {
    it('both fixtures satisfy the wire contract', () => {
        expect(() =>
            PlaceImageWireContract.parse(placeImageWireFixture)
        ).not.toThrow();
        expect(() =>
            PlaceImageWireContract.parse(placeImageNoCreditWireFixture)
        ).not.toThrow();
    });

    it('returns null and makes NO request for a blank name', async () => {
        const handler = vi.fn(() => HttpResponse.json(placeImageWireFixture));
        server.use(http.get(url, handler));
        expect(await fetchPlaceImage('   ')).toBeNull();
        expect(handler).not.toHaveBeenCalled();
    });

    it('reshapes a full payload and forwards trimmed name/city/country', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(url, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(placeImageWireFixture);
            })
        );
        const result = await fetchPlaceImage('  Paris ', '  Paris ', ' France ');
        expect(params!.get('name')).toBe('Paris');
        expect(params!.get('city')).toBe('Paris');
        expect(params!.get('country')).toBe('France');
        expect(result).toEqual({
            imageUrl: placeImageWireFixture.image_url,
            photographerName: placeImageWireFixture.photographer_name,
            photographerUrl: placeImageWireFixture.photographer_url,
            source: 'unsplash',
        });
    });

    it('omits city/country params when absent or whitespace-only', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(url, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(placeImageWireFixture);
            })
        );
        await fetchPlaceImage('Paris', '   ', null);
        expect(params!.get('name')).toBe('Paris');
        expect(params!.has('city')).toBe(false);
        expect(params!.has('country')).toBe(false);
    });

    it('passes null photographer fields straight through', async () => {
        server.use(
            http.get(url, () =>
                HttpResponse.json(placeImageNoCreditWireFixture)
            )
        );
        const result = await fetchPlaceImage('Kyoto');
        expect(result).toEqual({
            imageUrl: placeImageNoCreditWireFixture.image_url,
            photographerName: null,
            photographerUrl: null,
            source: 'pexels',
        });
    });

    it('maps a 404 no-match to null', async () => {
        server.use(
            http.get(url, () => new HttpResponse(null, { status: 404 }))
        );
        expect(await fetchPlaceImage('Nowhere')).toBeNull();
    });

    it('throws a descriptive error on a non-OK (non-404) response', async () => {
        server.use(
            http.get(url, () => new HttpResponse(null, { status: 500 }))
        );
        await expect(fetchPlaceImage('Paris')).rejects.toThrow(
            /\/places\/image failed: 500/
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = { ...placeImageWireFixture } as Record<string, unknown>;
        delete missing.image_url;
        expect(() => PlaceImageWireContract.parse(missing)).toThrow();
        expect(() =>
            PlaceImageWireContract.parse({
                ...placeImageWireFixture,
                mystery_field: true,
            })
        ).toThrow();
        expect(() =>
            PlaceImageWireContract.parse({
                ...placeImageWireFixture,
                source: 42,
            })
        ).toThrow();
    });
});
