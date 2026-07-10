import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    flightDeparturesFixture,
    flightDeparturesEmptyFixture,
} from '../../test/fixtures/flightDepartures';
import { useFlightDepartures } from './useFlightDepartures';

const ENDPOINT = 'http://localhost:8000/flights/departures';

describe('useFlightDepartures', () => {
    it('stays idle when the airport is not a 3-letter IATA code', () => {
        const { result } = renderHookWithProviders(() =>
            useFlightDepartures('EW', '2026-08-01')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when the date is not YYYY-MM-DD', () => {
        const { result } = renderHookWithProviders(() =>
            useFlightDepartures('EWR', 'tomorrow')
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('stays idle when the caller-controlled enabled flag is false', () => {
        const { result } = renderHookWithProviders(() =>
            useFlightDepartures('EWR', '2026-08-01', undefined, undefined, false)
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the departures list', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(flightDeparturesFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useFlightDepartures('EWR', '2026-08-01')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0]).toMatchObject({
            flightNumber: 'CM806',
            airline: 'Copa Airlines',
            airlineIata: 'CM',
            arrivalAirport: 'PTY',
            arrivalAirportName: 'Tocumen Intl',
        });
    });

    it('forwards airport (uppercased), date, from_time, airline + arrival filters', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(flightDeparturesEmptyFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useFlightDepartures('ewr', '2026-08-01', '06:00', 'cm', true, 'pty')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('airport')).toBe('EWR');
        expect(params.get('date')).toBe('2026-08-01');
        expect(params.get('from_time')).toBe('06:00');
        expect(params.get('airline')).toBe('CM');
        expect(params.get('arrival')).toBe('PTY');
    });

    it('fails soft (empty list, not error) when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useFlightDepartures('EWR', '2026-08-01')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
