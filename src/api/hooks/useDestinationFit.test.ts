import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { destinationFitWireFixture } from '../../test/fixtures/destinationFit';
import { setAuthToken } from '../authStorage';
import { useDestinationFit } from './useDestinationFit';

// Pro-gated: enabled only when `user && (isPaidMember || isAdmin) && params.name`.
// The client also short-circuits to null without an auth token, so the success
// path needs one stored.
let mockUser: { id: string; isPaidMember?: boolean } | null = {
    id: 'u1',
    isPaidMember: true,
};
let mockIsAdmin = false;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser, isAdmin: mockIsAdmin }),
}));

const ENDPOINT = 'http://localhost:8000/me/destination-fit';
const PARAMS = { name: 'Kyoto', country: 'Japan', kind: 'city' as const };

beforeEach(() => {
    mockUser = { id: 'u1', isPaidMember: true };
    mockIsAdmin = false;
    setAuthToken('test-token');
});

afterEach(() => {
    setAuthToken(null);
});

describe('useDestinationFit', () => {
    it('fetches the trimmed opinion for a Pro user with params', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(destinationFitWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useDestinationFit(PARAMS)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe(
            'Given your love of ramen and quiet temples, Kyoto is a strong fit.'
        );
    });

    it('forwards name/country/kind as query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(destinationFitWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useDestinationFit(PARAMS)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('name')).toBe('Kyoto');
        expect(params.get('country')).toBe('Japan');
        expect(params.get('kind')).toBe('city');
    });

    it('resolves to null (never throws) when the backend errors', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useDestinationFit(PARAMS)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('is disabled when params are null (no request)', () => {
        const { result } = renderHookWithProviders(() =>
            useDestinationFit(null)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled for a free non-admin user (no request)', () => {
        mockUser = { id: 'u1', isPaidMember: false };
        const { result } = renderHookWithProviders(() =>
            useDestinationFit(PARAMS)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('is disabled when logged out (no request)', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() =>
            useDestinationFit(PARAMS)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });
});
