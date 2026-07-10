import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    airportsResponseFixture,
    airportsEmptyFixture,
} from '../../test/fixtures/airports';
import { useAirports } from './useAirports';

const ENDPOINT = 'http://localhost:8000/airports/search';

describe('useAirports', () => {
    it('stays idle (no request, no data) for a blank/whitespace query', () => {
        // `enabled: trimmed.length >= 1` guards the disabled branch. No MSW
        // handler is registered — onUnhandledRequest:'error' would fail this
        // test if a request slipped through.
        const { result } = renderHookWithProviders(() => useAirports('   '));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fetches + returns reshaped matches for a non-empty query', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(airportsResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useAirports('san'));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.items).toHaveLength(2);
        expect(result.current.data?.items[0]).toMatchObject({
            iataCode: 'SFO',
            city: 'San Francisco',
        });
    });

    it('sends the trimmed query to the backend', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(airportsEmptyFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useAirports('  sfo  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('q')).toBe('sfo');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useAirports('sfo'));
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
