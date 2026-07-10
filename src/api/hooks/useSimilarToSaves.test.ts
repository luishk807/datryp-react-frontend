import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    similarToSavesFixture,
    similarToSavesEmptyFixture,
} from '../../test/fixtures/similarToSaves';
import { useSimilarToSaves } from './useSimilarToSaves';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const ENDPOINT = 'http://localhost:8000/me/similar-to-saves';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useSimilarToSaves', () => {
    it('fetches + reshapes the similar items when signed in', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(similarToSavesFixture))
        );
        const { result } = renderHookWithProviders(() => useSimilarToSaves());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.items).toHaveLength(2);
        expect(result.current.data?.items[0]).toMatchObject({
            placeKey: 'kyoto-jp',
            city: 'Kyoto',
            countryCode: 'JP',
            bestTimeToVisit: 'March to May',
            similarity: 0.87,
        });
        // Null country/image passthrough on the second item.
        expect(result.current.data?.items[1]).toMatchObject({
            placeKey: 'bali-id',
            countryCode: null,
            bestTimeToVisit: null,
        });
    });

    it('returns an empty list unchanged', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(similarToSavesEmptyFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useSimilarToSaves());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.items).toEqual([]);
    });

    it('is disabled when logged out (no request)', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useSimilarToSaves());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useSimilarToSaves());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
