import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    similarItemFixture,
    similarToSavesFixture,
    similarToSavesEmptyFixture,
} from 'test/fixtures/similarToSaves';
import {
    SimilarPlaceItemContract,
    SimilarToSavesContract,
} from 'test/contracts/similarToSaves.contract';
import { fetchSimilarToSaves } from './similarToSavesApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const URL = `${API_BASE}/me/similar-to-saves`;

describe('similarToSavesApi contract — GET /me/similar-to-saves', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            SimilarToSavesContract.parse(similarToSavesFixture)
        ).not.toThrow();
        expect(() =>
            SimilarPlaceItemContract.parse(similarItemFixture)
        ).not.toThrow();
    });

    it('fetchSimilarToSaves reshapes snake_case → camelCase', async () => {
        server.use(http.get(URL, () => HttpResponse.json(similarToSavesFixture)));
        const res = await fetchSimilarToSaves();
        expect(res.items).toHaveLength(2);
        expect(res.items[0]).toEqual({
            placeKey: 'kyoto-jp',
            name: 'Kyoto',
            city: 'Kyoto',
            country: 'Japan',
            countryCode: 'JP',
            imageUrl: 'https://img.example/kyoto.jpg',
            bestTimeToVisit: 'March to May',
            similarity: 0.87,
        });
        // Nullable passthrough
        expect(res.items[1].countryCode).toBeNull();
        expect(res.items[1].imageUrl).toBeNull();
        expect(res.items[1].bestTimeToVisit).toBeNull();
    });

    it('handles an empty item list', async () => {
        server.use(
            http.get(URL, () => HttpResponse.json(similarToSavesEmptyFixture))
        );
        expect((await fetchSimilarToSaves()).items).toEqual([]);
    });

    it('sends the stored bearer token in the Authorization header', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(similarToSavesEmptyFixture);
            })
        );
        await fetchSimilarToSaves();
        expect(authHeader).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'sentinel';
        server.use(
            http.get(URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(similarToSavesEmptyFixture);
            })
        );
        await fetchSimilarToSaves();
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.get(URL, () =>
                HttpResponse.json({ detail: 'chroma unavailable' }, { status: 503 })
            )
        );
        await expect(fetchSimilarToSaves()).rejects.toThrow(
            '/me/similar-to-saves 503 — chroma unavailable'
        );
    });

    it('throws a status-only error when the error body is not JSON', async () => {
        server.use(
            http.get(URL, () => new HttpResponse('oops', { status: 500 }))
        );
        await expect(fetchSimilarToSaves()).rejects.toThrow(
            '/me/similar-to-saves 500'
        );
    });

    it('contract catches a MISSING required field (backend drift)', () => {
        const missing = { ...similarItemFixture } as Record<string, unknown>;
        delete missing.place_key;
        expect(() => SimilarPlaceItemContract.parse(missing)).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            SimilarPlaceItemContract.parse({ ...similarItemFixture, rank: 1 })
        ).toThrow();
    });

    it('contract catches a WRONG-typed field (string where number similarity)', () => {
        expect(() =>
            SimilarPlaceItemContract.parse({
                ...similarItemFixture,
                similarity: '0.9',
            })
        ).toThrow();
    });
});
