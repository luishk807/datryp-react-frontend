import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    airportsResponseFixture,
    airportsEmptyFixture,
} from '../../test/fixtures/airports';
import { useDestinationAirport } from './useDestinationAirport';

const ENDPOINT = 'http://localhost:8000/airports/search';

describe('useDestinationAirport', () => {
    it('stays idle when the query is shorter than 2 chars', () => {
        const { result } = renderHookWithProviders(() =>
            useDestinationAirport('a')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when the query is undefined', () => {
        const { result } = renderHookWithProviders(() =>
            useDestinationAirport(undefined)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('stays idle when the enabled flag is false', () => {
        const { result } = renderHookWithProviders(() =>
            useDestinationAirport('Maldives', false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('resolves the top match IATA code for a destination', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(airportsResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useDestinationAirport('San Francisco')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBe('SFO');
    });

    it('forwards the trimmed query with limit=1', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(airportsResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useDestinationAirport('  Maldives  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('q')).toBe('Maldives');
        expect(params.get('limit')).toBe('1');
    });

    it('resolves to null when nothing matches', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(airportsEmptyFixture))
        );
        const { result } = renderHookWithProviders(() =>
            useDestinationAirport('Nowhereland')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useDestinationAirport('Maldives')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
