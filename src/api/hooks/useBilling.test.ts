import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    checkoutSessionFixture,
    portalSessionFixture,
} from '../../test/fixtures/billing';
import { useStartCheckout, useOpenBillingPortal } from './useBilling';

const BASE = 'http://localhost:8000';

// Both mutations end by assigning `window.location.href` (leaving the SPA for
// Stripe). Stub location so the redirect target is capturable and jsdom's
// unimplemented-navigation noise is suppressed.
beforeEach(() => {
    vi.stubGlobal('location', { href: '' });
});
afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useStartCheckout', () => {
    it('POSTs the chosen plan and redirects to the hosted checkout URL', async () => {
        let body: Record<string, unknown> | undefined;
        server.use(
            http.post(
                `${BASE}/billing/checkout-session`,
                async ({ request }) => {
                    body = (await request.json()) as Record<string, unknown>;
                    return HttpResponse.json(checkoutSessionFixture);
                }
            )
        );
        const { result } = renderHookWithProviders(() => useStartCheckout());

        await act(async () => {
            await result.current.mutateAsync('yearly');
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(body).toEqual({ plan: 'yearly' });
        expect(window.location.href).toBe(checkoutSessionFixture.url);
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.post(
                `${BASE}/billing/checkout-session`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useStartCheckout());

        await act(async () => {
            await expect(
                result.current.mutateAsync('monthly')
            ).rejects.toThrow();
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useOpenBillingPortal', () => {
    it('POSTs to the portal endpoint and redirects to the returned URL', async () => {
        let method = '';
        server.use(
            http.post(`${BASE}/billing/portal-session`, ({ request }) => {
                method = request.method;
                return HttpResponse.json(portalSessionFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useOpenBillingPortal()
        );

        await act(async () => {
            await result.current.mutateAsync();
        });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(method).toBe('POST');
        expect(window.location.href).toBe(portalSessionFixture.url);
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.post(
                `${BASE}/billing/portal-session`,
                () => new HttpResponse(null, { status: 404 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useOpenBillingPortal()
        );

        await act(async () => {
            await expect(result.current.mutateAsync()).rejects.toThrow();
        });
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
