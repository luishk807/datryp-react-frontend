import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    nextMonthPicksFixture,
    nextMonthPicksEmptyFixture,
} from '../../test/fixtures/nextMonthPicks';
import { useNextMonthPicks } from './useNextMonthPicks';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const ENDPOINT = 'http://localhost:8000/me/next-month-picks';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useNextMonthPicks', () => {
    it('fetches + reshapes the picks when signed in', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(nextMonthPicksFixture))
        );
        const { result } = renderHookWithProviders(() => useNextMonthPicks());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.monthLabel).toBe('August');
        expect(result.current.data?.items).toHaveLength(2);
        expect(result.current.data?.items[0]).toMatchObject({
            kind: 'place',
            key: 'santorini-gr',
            countryCode: 'GR',
            bestTimeToVisit: 'May to October',
            savedAt: '2026-06-01T12:00:00Z',
        });
    });

    it('returns an empty list unchanged', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(nextMonthPicksEmptyFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useNextMonthPicks());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.items).toEqual([]);
    });

    it('is disabled when logged out (no request)', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useNextMonthPicks());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useNextMonthPicks());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
