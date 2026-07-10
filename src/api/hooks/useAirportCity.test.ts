import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { airportsResponseFixture } from '../../test/fixtures/airports';
import { useAirportCity } from './useAirportCity';

const ENDPOINT = 'http://localhost:8000/airports/search';

describe('useAirportCity', () => {
    it('stays idle when the code is shorter than 2 chars', () => {
        const { result } = renderHookWithProviders(() => useAirportCity('A'));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when the code is undefined', () => {
        const { result } = renderHookWithProviders(() =>
            useAirportCity(undefined)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('resolves the city name on an exact IATA match', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(airportsResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useAirportCity('SFO'));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe('San Francisco');
    });

    it('forwards the trimmed code with limit=1', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(airportsResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useAirportCity('  sfo  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('q')).toBe('sfo');
        expect(params.get('limit')).toBe('1');
    });

    it('resolves to null when the top hit does not exact-match the code', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(airportsResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useAirportCity('XYZ'));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useAirportCity('SFO'));
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
