import { describe, it, expect } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { usePlaces } from './usePlaces';

// Unified city+country autocomplete on the PYTHON GraphQL backend (port 8000).
const pythonGql = graphql.link('http://localhost:8000/graphql');

describe('usePlaces', () => {
    it('unwraps the `places` array out of the GraphQL envelope', async () => {
        const places = [
            {
                id: 'city:1',
                kind: 'city',
                name: 'Tokyo',
                countryCode: 'JP',
                countryName: 'Japan',
                population: 37000000,
                latitude: 35.6,
                longitude: 139.6,
            },
        ];
        server.use(
            pythonGql.query('Places', () =>
                HttpResponse.json({ data: { places } })
            )
        );

        const { result } = renderHookWithProviders(() => usePlaces('tok'));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(places);
    });

    it('stays idle (no request) for a blank/whitespace query', () => {
        // `enabled: trimmed.length > 0` is the default guard — no handler is
        // registered, so onUnhandledRequest:'error' fails if a request fires.
        const { result } = renderHookWithProviders(() => usePlaces('   '));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fires for an empty query when explicitly enabled', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.query('Places', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({ data: { places: [] } });
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePlaces('', { enabled: true })
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(variables).toEqual({ query: '', limit: 10 });
    });

    it('forwards the trimmed query + custom limit as variables', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.query('Places', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({ data: { places: [] } });
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePlaces('  paris  ', { limit: 5 })
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(variables).toEqual({ query: 'paris', limit: 5 });
    });

    it('surfaces a GraphQL error response', async () => {
        server.use(
            pythonGql.query('Places', () =>
                HttpResponse.json({ errors: [{ message: 'boom' }] })
            )
        );
        const { result } = renderHookWithProviders(() => usePlaces('tok'));
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
