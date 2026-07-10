import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { useFxRates } from './useFxRates';

const ENDPOINT = 'https://api.frankfurter.dev/v1/latest';

describe('useFxRates', () => {
    it('fetches ECB rates from USD and always seeds USD=1', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json({
                    amount: 1,
                    base: 'USD',
                    date: '2026-07-10',
                    rates: { EUR: 0.92, JPY: 157.3 },
                });
            })
        );
        const { result } = renderHookWithProviders(() => useFxRates());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(params!.get('from')).toBe('USD');
        expect(result.current.data).toEqual({
            USD: 1,
            EUR: 0.92,
            JPY: 157.3,
        });
    });

    it('surfaces an error when the FX endpoint fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useFxRates());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
