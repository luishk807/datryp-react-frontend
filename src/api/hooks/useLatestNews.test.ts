import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { newsResponseFixture, newsNoItemFixture } from '../../test/fixtures/news';
import { useLatestNews } from './useLatestNews';

const ENDPOINT = 'http://localhost:8000/news/top';

describe('useLatestNews', () => {
    it('stays idle (no request, no data) for a blank/whitespace query', () => {
        // `enabled: trimmed.length > 0` guards the disabled branch. No MSW
        // handler is registered — onUnhandledRequest:'error' would fail here
        // if a request slipped through.
        const { result } = renderHookWithProviders(() => useLatestNews('   '));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle for a null query', () => {
        const { result } = renderHookWithProviders(() => useLatestNews(null));
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the top story', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(newsResponseFixture))
        );
        const { result } = renderHookWithProviders(() =>
            useLatestNews('Tokyo travel')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
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

    it('maps a zero-results envelope to a null item', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(newsNoItemFixture))
        );
        const { result } = renderHookWithProviders(() =>
            useLatestNews('zzqx obscure query')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.item).toBeNull();
    });

    it('sends the trimmed query to the backend', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(newsResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useLatestNews('  Tokyo travel  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('q')).toBe('Tokyo travel');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useLatestNews('Tokyo travel')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
