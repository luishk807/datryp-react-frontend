import { describe, it, expect } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { useMe } from './useMe';

// `useMe` talks to the NODE GraphQL backend (port 4000, `graphqlClient`).
const nodeGql = graphql.link('http://localhost:4000/graphql');

describe('useMe', () => {
    it('selects the `me` node out of the GraphQL envelope', async () => {
        const me = { id: 'u1', name: 'Ada', email: 'ada@example.com' };
        server.use(nodeGql.query('Me', () => HttpResponse.json({ data: { me } })));

        const { result } = renderHookWithProviders(() => useMe());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(me);
    });

    it('surfaces a GraphQL error response', async () => {
        server.use(
            nodeGql.query('Me', () =>
                HttpResponse.json({ errors: [{ message: 'unauthenticated' }] })
            )
        );
        const { result } = renderHookWithProviders(() => useMe());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
