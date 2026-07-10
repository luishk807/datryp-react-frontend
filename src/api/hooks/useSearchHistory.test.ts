import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    searchHistoryResponseFixture,
    searchHistoryNoTotalFixture,
} from '../../test/fixtures/searchHistory';
import { setAuthToken } from '../authStorage';
import { useSearchHistory } from './useSearchHistory';

const BASE = 'http://localhost:8000';

// This hook gates on `useCurrentUser` (from api/hooks/useAuth), so mock that
// module here — only in THIS file — to flip signed-in vs. logged-out.
let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('api/hooks/useAuth', () => ({
    useCurrentUser: () => ({ data: mockUser }),
}));

beforeEach(() => {
    mockUser = { id: 'u1' };
    // fetchSearchHistory returns an empty page without a token, so set one to
    // make the real request fire.
    setAuthToken('a-token');
});

describe('useSearchHistory', () => {
    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useSearchHistory());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fetches + reshapes the page when signed in', async () => {
        server.use(
            http.get(`${BASE}/me/search-history`, () =>
                HttpResponse.json(searchHistoryResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useSearchHistory());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            items: [
                { query: 'Bali', lastSearchedAt: '2026-07-08T12:00:00Z' },
                { query: 'Tokyo', lastSearchedAt: '2026-07-07T09:30:00Z' },
            ],
            total: 2,
        });
    });

    it('sends default limit=10 / offset=0', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(`${BASE}/me/search-history`, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(searchHistoryResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() => useSearchHistory());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('limit')).toBe('10');
        expect(params!.get('offset')).toBe('0');
    });

    it('forwards custom limit + offset', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(`${BASE}/me/search-history`, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(searchHistoryResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useSearchHistory({ limit: 25, offset: 50 })
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('limit')).toBe('25');
        expect(params!.get('offset')).toBe('50');
    });

    it('treats a bare number arg as the limit (back-compat)', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(`${BASE}/me/search-history`, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(searchHistoryResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() => useSearchHistory(5));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('limit')).toBe('5');
        expect(params!.get('offset')).toBe('0');
    });

    it('defaults total to 0 when the backend omits it', async () => {
        server.use(
            http.get(`${BASE}/me/search-history`, () =>
                HttpResponse.json(searchHistoryNoTotalFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useSearchHistory());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.total).toBe(0);
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(
                `${BASE}/me/search-history`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useSearchHistory());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
