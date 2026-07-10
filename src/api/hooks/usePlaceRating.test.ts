import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    placeRatingWireFixture,
    placeRatingNoMatchWireFixture,
} from '../../test/fixtures/placeRating';
import { usePlaceRating } from './usePlaceRating';

const ENDPOINT = 'http://localhost:8000/places/rating';

// `useUser` is mocked so tests can flip entitlement (paid / admin / free).
let mockUser: { id: string; isPaidMember: boolean } | null = {
    id: 'u1',
    isPaidMember: true,
};
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

beforeEach(() => {
    mockUser = { id: 'u1', isPaidMember: true };
    mockIsAdmin = false;
});

describe('usePlaceRating', () => {
    it('fetches + reshapes a rating for an entitled (paid) user', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(placeRatingWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceRating('Eiffel Tower')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            name: 'Eiffel Tower',
            rating: 4.7,
            userRatingCount: 289456,
            formattedAddress:
                'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
        });
    });

    it('forwards name, location, and fields params', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(placeRatingWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceRating('Eiffel Tower', 'Paris', true, 'rating')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('name')).toBe('Eiffel Tower');
        expect(params!.get('location')).toBe('Paris');
        expect(params!.get('fields')).toBe('rating');
    });

    it('returns null on a no-match envelope', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(placeRatingNoMatchWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceRating('Nowhere Place')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('is entitled for an admin even when not a paid member', async () => {
        mockUser = { id: 'u1', isPaidMember: false };
        mockIsAdmin = true;
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(placeRatingWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceRating('Eiffel Tower')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.rating).toBe(4.7);
    });

    it('is idle for a free, non-admin user (not entitled)', () => {
        mockUser = { id: 'u1', isPaidMember: false };
        mockIsAdmin = false;
        const { result } = renderHookWithProviders(() =>
            usePlaceRating('Eiffel Tower')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is idle when the name is shorter than 2 chars', () => {
        const { result } = renderHookWithProviders(() => usePlaceRating('a'));
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('is idle when explicitly disabled via the enabled flag', () => {
        const { result } = renderHookWithProviders(() =>
            usePlaceRating('Eiffel Tower', undefined, false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });
});
