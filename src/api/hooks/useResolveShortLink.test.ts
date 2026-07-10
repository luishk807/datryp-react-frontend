import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { useResolveShortLink, isShortLinkUrl } from './useResolveShortLink';

const ENDPOINT = 'http://localhost:8000/places/resolve-link';
const SHORT = 'https://maps.app.goo.gl/abc123';

describe('isShortLinkUrl', () => {
    it('recognizes known short-link hosts', () => {
        expect(isShortLinkUrl('https://maps.app.goo.gl/x')).toBe(true);
        expect(isShortLinkUrl('https://goo.gl/maps/x')).toBe(true);
        expect(isShortLinkUrl('https://g.co/x')).toBe(true);
    });

    it('rejects non-short and malformed inputs', () => {
        expect(isShortLinkUrl('https://example.com/foo')).toBe(false);
        expect(isShortLinkUrl('not a url')).toBe(false);
        expect(isShortLinkUrl('maps.app.goo.gl/x')).toBe(false);
    });
});

describe('useResolveShortLink', () => {
    it('stays idle (no request) for a non-short link', () => {
        // `enabled: enabled && isShort` gates this. No MSW handler is
        // registered — a leaked request would fail the test.
        const { result } = renderHookWithProviders(() =>
            useResolveShortLink('https://example.com/foo')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when explicitly disabled even for a short link', () => {
        const { result } = renderHookWithProviders(() =>
            useResolveShortLink(SHORT, { enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('resolves a short link to its final url', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json({
                    url: 'https://www.google.com/maps/place/Eiffel+Tower',
                })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useResolveShortLink(SHORT)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(
            'https://www.google.com/maps/place/Eiffel+Tower'
        );
    });

    it('returns null when the backend has no resolution', async () => {
        server.use(http.get(ENDPOINT, () => HttpResponse.json({ url: null })));
        const { result } = renderHookWithProviders(() =>
            useResolveShortLink(SHORT)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('forwards the input url as a query param', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json({ url: 'https://final.example' });
            })
        );
        const { result } = renderHookWithProviders(() =>
            useResolveShortLink(SHORT)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('url')).toBe(SHORT);
    });

    it('swallows a backend failure into a null result', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useResolveShortLink(SHORT)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });
});
