import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { SearchHistoryWireContract } from '../test/contracts/searchHistory.contract';
import {
    searchHistoryResponseFixture,
    searchHistoryNoTotalFixture,
} from '../test/fixtures/searchHistory';
import { fetchSearchHistory } from './searchHistoryApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/me/search-history`;

// Contract tests for the authenticated search-history boundary: bearer token,
// offset/limit paging, snake→camel reshaping, and the optional-`total` default.
describe('searchHistoryApi contract — GET /me/search-history', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            SearchHistoryWireContract.parse(searchHistoryResponseFixture)
        ).not.toThrow();
        expect(() =>
            SearchHistoryWireContract.parse(searchHistoryNoTotalFixture)
        ).not.toThrow();
    });

    it('returns an empty page (no request) when no token is stored', async () => {
        setAuthToken(null);
        expect(await fetchSearchHistory()).toEqual({ items: [], total: 0 });
    });

    it('maps items → camelCase, returns total, and sends the bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(searchHistoryResponseFixture);
            })
        );
        const res = await fetchSearchHistory();
        expect(res).toEqual({
            items: [
                { query: 'Bali', lastSearchedAt: '2026-07-08T12:00:00Z' },
                { query: 'Tokyo', lastSearchedAt: '2026-07-07T09:30:00Z' },
            ],
            total: 2,
        });
        expect(authHeader).toBe('Bearer test-token');
    });

    it('sends default limit=10 & offset=0 and forwards custom paging', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(searchHistoryResponseFixture);
            })
        );
        await fetchSearchHistory();
        let params = new URL(requestUrl).searchParams;
        expect(params.get('limit')).toBe('10');
        expect(params.get('offset')).toBe('0');

        await fetchSearchHistory({ limit: 25, offset: 50 });
        params = new URL(requestUrl).searchParams;
        expect(params.get('limit')).toBe('25');
        expect(params.get('offset')).toBe('50');
    });

    it('defaults total to 0 when the backend omits the field', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(searchHistoryNoTotalFixture)
            )
        );
        const res = await fetchSearchHistory();
        expect(res.total).toBe(0);
        expect(res.items).toHaveLength(1);
        expect(res.items[0]).toEqual({
            query: 'Rome',
            lastSearchedAt: '2026-07-06T08:00:00Z',
        });
    });

    it('throws on a non-OK response', async () => {
        server.use(
            http.get(
                ENDPOINT,
                () =>
                    new HttpResponse(null, {
                        status: 401,
                        statusText: 'Unauthorized',
                    })
            )
        );
        await expect(fetchSearchHistory()).rejects.toThrow(
            '/me/search-history failed: 401'
        );
    });

    it('contract catches drift (missing items / extra field / wrong-typed item)', () => {
        expect(() => SearchHistoryWireContract.parse({ total: 2 })).toThrow();
        expect(() =>
            SearchHistoryWireContract.parse({
                ...searchHistoryResponseFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            SearchHistoryWireContract.parse({
                items: [{ query: 5, last_searched_at: 'x' }],
            })
        ).toThrow();
    });
});
