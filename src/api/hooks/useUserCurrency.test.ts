import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { useUserCurrency } from './useUserCurrency';

const ENDPOINT = 'https://ipapi.co/json/';
const SESSION_KEY = 'datryp:user-currency';

beforeEach(() => {
    window.sessionStorage.clear();
});

describe('useUserCurrency', () => {
    it('detects the currency from ipapi, uppercases it, and caches it', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json({ currency: 'eur' }))
        );
        const { result } = renderHookWithProviders(() => useUserCurrency());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe('EUR');
        expect(window.sessionStorage.getItem(SESSION_KEY)).toBe('EUR');
    });

    it('returns the session-cached currency without hitting the network', async () => {
        window.sessionStorage.setItem(SESSION_KEY, 'JPY');
        // No handler registered — onUnhandledRequest:'error' would fail this
        // test if the sessionStorage short-circuit didn't fire.
        const { result } = renderHookWithProviders(() => useUserCurrency());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe('JPY');
    });

    it('falls back to USD (not an error) when ipapi responds non-ok', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useUserCurrency());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe('USD');
        expect(window.sessionStorage.getItem(SESSION_KEY)).toBeNull();
    });

    it('falls back to USD when the fetch itself throws', async () => {
        server.use(http.get(ENDPOINT, () => HttpResponse.error()));
        const { result } = renderHookWithProviders(() => useUserCurrency());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe('USD');
    });
});
