import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { friendsVisitedWireFixture } from '../../test/fixtures/friendsVisited';
import { useFriendsVisited } from './useFriendsVisited';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const ENDPOINT = 'http://localhost:8000/me/friends-visited/:kind/:key';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useFriendsVisited', () => {
    it('fetches + reshapes the friends list for a place', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(friendsVisitedWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useFriendsVisited('place', 'fushimi-inari')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            count: 2,
            friends: [
                {
                    userId: 'u1',
                    name: 'Ada Traveler',
                    profileImageUrl: 'https://images.example.com/ada.jpg',
                    visitedAt: '2026-05-01T00:00:00Z',
                    rating: 5,
                    reviewText: 'Unforgettable sunrise hike.',
                },
                {
                    userId: 'u2',
                    name: 'Ben Nomad',
                    profileImageUrl: null,
                    visitedAt: '2026-04-14T00:00:00Z',
                    rating: null,
                    reviewText: null,
                },
            ],
        });
    });

    it('is disabled (no request) when key is missing', () => {
        const { result } = renderHookWithProviders(() =>
            useFriendsVisited('place', null)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() =>
            useFriendsVisited('place', 'fushimi-inari')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('forwards the review_key query param + kind/key path for city pages', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(friendsVisitedWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useFriendsVisited('city', 'kyoto-jp', 'kyoto-japan-review')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const url = new URL(requestUrl);
        expect(url.pathname).toBe('/me/friends-visited/city/kyoto-jp');
        expect(url.searchParams.get('review_key')).toBe('kyoto-japan-review');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useFriendsVisited('place', 'fushimi-inari')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
