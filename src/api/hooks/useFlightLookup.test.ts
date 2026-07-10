import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    flightLookupResponseFixture,
    flightLookupNoMatchFixture,
} from '../../test/fixtures/flightLookup';
import { useFlightLookup } from './useFlightLookup';

const ENDPOINT = 'http://localhost:8000/flights/lookup';

describe('useFlightLookup', () => {
    it('stays idle when the flight number is shorter than 3 chars', () => {
        const { result } = renderHookWithProviders(() =>
            useFlightLookup('BA', '2026-09-01')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when the date is not YYYY-MM-DD', () => {
        const { result } = renderHookWithProviders(() =>
            useFlightLookup('UA123', '09/01/2026')
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('stays idle when the caller-controlled enabled flag is false', () => {
        const { result } = renderHookWithProviders(() =>
            useFlightLookup('UA123', '2026-09-01', false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes a matched flight', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(flightLookupResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useFlightLookup('UA123', '2026-09-01')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            flightNumber: 'UA123',
            departAirport: 'SFO',
            arrivalAirport: 'JFK',
            departTime: '08:30',
            airline: 'United Airlines',
        });
    });

    it('forwards the uppercased number + date as query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(flightLookupResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useFlightLookup('  ua123  ', '2026-09-01')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('number')).toBe('UA123');
        expect(params.get('date')).toBe('2026-09-01');
    });

    it('resolves to null on a no-match response', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(flightLookupNoMatchFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useFlightLookup('UA999', '2026-09-01')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('fails soft (null, not error) when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useFlightLookup('UA123', '2026-09-01')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });
});
