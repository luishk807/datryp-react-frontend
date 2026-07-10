import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { friendsVisitedAllWireFixture } from '../../test/fixtures/friendsVisited';
import { useFriendsVisitedAll } from './useFriendsVisitedAll';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const ENDPOINT = 'http://localhost:8000/me/friends-visited/all';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('useFriendsVisitedAll', () => {
    it('fetches + reshapes the grouped countries/cities/places overlay', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(friendsVisitedAllWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useFriendsVisitedAll());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            countries: [
                {
                    countryCode: 'JP',
                    countryName: 'Japan',
                    friends: [
                        {
                            userId: 'u1',
                            name: 'Ada Traveler',
                            profileImageUrl: null,
                        },
                    ],
                },
            ],
            cities: [
                {
                    citySlug: 'kyoto-jp',
                    cityName: 'Kyoto',
                    countryName: 'Japan',
                    countryCode: 'JP',
                    latitude: 35.0116,
                    longitude: 135.7681,
                    friends: [
                        {
                            userId: 'u2',
                            name: 'Ben Nomad',
                            profileImageUrl: 'https://images.example.com/ben.jpg',
                        },
                    ],
                },
            ],
            places: [
                {
                    placeKey: 'fushimi-inari',
                    placeName: 'Fushimi Inari Taisha',
                    placeCity: 'Kyoto',
                    placeCountry: 'Japan',
                    latitude: 34.9671,
                    longitude: 135.7727,
                    friends: [
                        {
                            userId: 'u1',
                            name: 'Ada Traveler',
                            profileImageUrl: null,
                        },
                    ],
                },
            ],
        });
    });

    it('is disabled (no request) when the caller passes enabled=false', () => {
        const { result } = renderHookWithProviders(() =>
            useFriendsVisitedAll(false)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled (no request) when logged out', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useFriendsVisitedAll());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useFriendsVisitedAll());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
