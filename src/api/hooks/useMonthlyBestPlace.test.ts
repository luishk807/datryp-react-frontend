import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { monthlyBestPlaceWireFixture } from '../../test/fixtures/monthlyBestPlace';
import { useMonthlyBestPlace } from './useMonthlyBestPlace';

// Pro-gated: enabled only when `user && (user.isPaidMember || isAdmin)` AND the
// caller-supplied `enabled` flag is not false.
let mockUser: { id: string; isPaidMember?: boolean } | null = {
    id: 'u1',
    isPaidMember: true,
};
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

const ENDPOINT = 'http://localhost:8000/me/monthly-best-place';

beforeEach(() => {
    mockUser = { id: 'u1', isPaidMember: true };
    mockIsAdmin = false;
});

describe('useMonthlyBestPlace', () => {
    it('fetches + reshapes the payload for a Pro user', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(monthlyBestPlaceWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useMonthlyBestPlace());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.monthKey).toBe('2026-07');
        expect(result.current.data?.place).toMatchObject({
            name: 'Reykjavik',
            countryCode: 'IS',
            whyForYou:
                'Long July daylight suits your hiking streak and photography interest.',
        });
        expect(result.current.data?.highlights).toHaveLength(2);
    });

    it('is enabled for an admin even without a paid plan', async () => {
        mockUser = { id: 'u1', isPaidMember: false };
        mockIsAdmin = true;
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(monthlyBestPlaceWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useMonthlyBestPlace());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('is disabled for a free non-admin user (no request)', () => {
        mockUser = { id: 'u1', isPaidMember: false };
        const { result } = renderHookWithProviders(() => useMonthlyBestPlace());
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled when the caller passes enabled: false, even for Pro', () => {
        const { result } = renderHookWithProviders(() =>
            useMonthlyBestPlace({ enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled when logged out (no request)', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() => useMonthlyBestPlace());
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useMonthlyBestPlace());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
