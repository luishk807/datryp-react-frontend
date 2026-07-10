import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { NewsTopWireContract } from '../test/contracts/news.contract';
import {
    newsResponseFixture,
    newsNoItemFixture,
} from '../test/fixtures/news';
import { fetchTopNews } from './newsApi';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/news/top`;

// Contract tests for the top-news boundary: pin the wire shape and the
// snake→camel reshaping (including the null-item "hide the widget" path).
// Throws on non-OK.
describe('newsApi contract — GET /news/top', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            NewsTopWireContract.parse(newsResponseFixture)
        ).not.toThrow();
        expect(() =>
            NewsTopWireContract.parse(newsNoItemFixture)
        ).not.toThrow();
    });

    it('maps the wire payload → camelCase LatestNewsResult (with item)', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(newsResponseFixture))
        );
        expect(await fetchTopNews('Tokyo travel')).toEqual({
            query: 'Tokyo travel',
            searchUrl: 'https://news.google.com/search?q=Tokyo%20travel',
            item: {
                title: 'Tokyo reopens historic district to tourists',
                source: 'Reuters',
                publishedAt: '2026-07-09T10:00:00Z',
                link: 'https://news.google.com/rss/articles/abc123',
            },
        });
    });

    it('maps item → null when Google returned zero results', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(newsNoItemFixture))
        );
        const res = await fetchTopNews('zzqx obscure query');
        expect(res.item).toBeNull();
        expect(res.searchUrl).toBe(newsNoItemFixture.search_url);
        expect(res.query).toBe('zzqx obscure query');
    });

    it('URL-encodes the query', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(newsResponseFixture);
            })
        );
        await fetchTopNews('Tokyo travel');
        expect(new URL(requestUrl).searchParams.get('q')).toBe('Tokyo travel');
    });

    it('throws on a non-OK response', async () => {
        server.use(
            http.get(
                ENDPOINT,
                () =>
                    new HttpResponse(null, {
                        status: 500,
                        statusText: 'Server Error',
                    })
            )
        );
        await expect(fetchTopNews('x')).rejects.toThrow('/news/top failed: 500');
    });

    it('contract catches drift (missing search_url / extra field / wrong-typed item)', () => {
        expect(() =>
            NewsTopWireContract.parse({ query: 'x', item: null })
        ).toThrow();
        expect(() =>
            NewsTopWireContract.parse({ ...newsResponseFixture, extra: 1 })
        ).toThrow();
        expect(() =>
            NewsTopWireContract.parse({
                ...newsResponseFixture,
                item: { ...newsResponseFixture.item, title: 42 },
            })
        ).toThrow();
    });
});
