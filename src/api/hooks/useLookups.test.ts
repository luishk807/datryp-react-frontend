import { describe, it, expect } from 'vitest';
import { graphql, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { useItineraryTypes, useTripStatuses } from './useLookups';

// Lookup hooks hit the PYTHON GraphQL backend (port 8000, `pythonGqlClient`).
const pythonGql = graphql.link('http://localhost:8000/graphql');

describe('useItineraryTypes', () => {
    it('unwraps `itineraryTypes` rows from the response', async () => {
        const rows = [
            { id: 't1', name: 'Single Trip' },
            { id: 't2', name: 'Multi Trip' },
        ];
        server.use(
            pythonGql.query('ItineraryTypes', () =>
                HttpResponse.json({ data: { itineraryTypes: rows } })
            )
        );
        const { result } = renderHookWithProviders(() => useItineraryTypes());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(rows);
    });
});

describe('useTripStatuses', () => {
    it('unwraps `tripStatuses` rows from the response', async () => {
        const rows = [
            { id: 's1', name: 'Planning' },
            { id: 's2', name: 'Confirmed' },
        ];
        server.use(
            pythonGql.query('TripStatuses', () =>
                HttpResponse.json({ data: { tripStatuses: rows } })
            )
        );
        const { result } = renderHookWithProviders(() => useTripStatuses());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual(rows);
    });

    it('surfaces a GraphQL error', async () => {
        server.use(
            pythonGql.query('TripStatuses', () =>
                HttpResponse.json({ errors: [{ message: 'boom' }] })
            )
        );
        const { result } = renderHookWithProviders(() => useTripStatuses());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
