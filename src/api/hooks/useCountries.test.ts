import { describe, it, expect } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { useCountries } from './useCountries';

// Country catalog lives on the PYTHON GraphQL backend (port 8000).
const pythonGql = graphql.link('http://localhost:8000/graphql');

describe('useCountries', () => {
    it('unwraps the `countries` array out of the GraphQL envelope', async () => {
        const countries = [
            {
                id: 'c1',
                name: 'Japan',
                code: 'JP',
                local: '日本',
                image: null,
            },
        ];
        server.use(
            pythonGql.query('Countries', () =>
                HttpResponse.json({ data: { countries } })
            )
        );

        const { result } = renderHookWithProviders(() => useCountries('jap'));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(countries);
    });

    it('forwards the trimmed query + default limit as variables', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.query('Countries', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({ data: { countries: [] } });
            })
        );

        const { result } = renderHookWithProviders(() =>
            useCountries('  japan  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(variables).toEqual({ query: 'japan', limit: 10 });
    });

    it('forwards a custom limit from options', async () => {
        let variables: Record<string, unknown> | undefined;
        server.use(
            pythonGql.query('Countries', ({ variables: v }) => {
                variables = v;
                return HttpResponse.json({ data: { countries: [] } });
            })
        );

        const { result } = renderHookWithProviders(() =>
            useCountries('fr', { limit: 25 })
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(variables).toEqual({ query: 'fr', limit: 25 });
    });

    it('stays idle (no request) when disabled via options', () => {
        const { result } = renderHookWithProviders(() =>
            useCountries('jp', { enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces a GraphQL error response', async () => {
        server.use(
            pythonGql.query('Countries', () =>
                HttpResponse.json({ errors: [{ message: 'boom' }] })
            )
        );
        const { result } = renderHookWithProviders(() => useCountries('jp'));
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
