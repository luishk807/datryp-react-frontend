import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { holidaySuggestionsWireFixture } from '../../test/fixtures/holidaySuggestions';
import { useHolidaySuggestions } from './useHolidaySuggestions';

// Pro-gated: enabled only when `user && (user.isPaidMember || isAdmin)`.
let mockUser: { id: string; isPaidMember?: boolean } | null = {
    id: 'u1',
    isPaidMember: true,
};
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

const ENDPOINT = 'http://localhost:8000/me/holiday-suggestions';

beforeEach(() => {
    mockUser = { id: 'u1', isPaidMember: true };
    mockIsAdmin = false;
});

describe('useHolidaySuggestions', () => {
    it('fetches + reshapes the payload for a Pro user', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(holidaySuggestionsWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useHolidaySuggestions()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.holiday).toMatchObject({
            name: 'Día de los Muertos',
            imageUrl: 'https://images.example.com/muertos.jpg',
            photographerName: 'Ana López',
        });
        expect(result.current.data?.places[0]).toMatchObject({
            name: 'Oaxaca',
            countryCode: 'MX',
        });
        expect(result.current.data?.activities).toEqual(
            holidaySuggestionsWireFixture.activities
        );
    });

    it('is enabled for an admin even without a paid plan', async () => {
        mockUser = { id: 'u1', isPaidMember: false };
        mockIsAdmin = true;
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(holidaySuggestionsWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useHolidaySuggestions()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('is disabled for a free non-admin user (no request)', () => {
        mockUser = { id: 'u1', isPaidMember: false };
        const { result } = renderHookWithProviders(() =>
            useHolidaySuggestions()
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled when logged out (no request)', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() =>
            useHolidaySuggestions()
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useHolidaySuggestions()
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
