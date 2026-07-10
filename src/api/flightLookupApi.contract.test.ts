import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { FlightLookupWireContract } from '../test/contracts/flightLookup.contract';
import {
    flightLookupResponseFixture,
    flightLookupNoMatchFixture,
} from '../test/fixtures/flightLookup';
import { lookupFlight } from './flightLookupApi';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/flights/lookup`;

// Contract tests for the fail-soft flight-lookup boundary: no-match / non-OK
// resolve to null (never reject) so the form keeps the user's typed value.
describe('flightLookupApi contract — GET /flights/lookup', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            FlightLookupWireContract.parse(flightLookupResponseFixture)
        ).not.toThrow();
        expect(() =>
            FlightLookupWireContract.parse(flightLookupNoMatchFixture)
        ).not.toThrow();
    });

    it('short-circuits to null (no request) when the flight number is blank', async () => {
        expect(await lookupFlight('   ', '2026-09-01')).toBeNull();
    });

    it('short-circuits to null (no request) when the date is empty', async () => {
        expect(await lookupFlight('UA123', '')).toBeNull();
    });

    it('maps the wire result → camelCase FlightLookupResult', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(flightLookupResponseFixture)
            )
        );
        expect(await lookupFlight(' UA123 ', '2026-09-01')).toEqual({
            flightNumber: 'UA123',
            departAirport: 'SFO',
            arrivalAirport: 'JFK',
            departDate: '2026-09-01',
            departTime: '08:30',
            arrivalDate: '2026-09-01',
            arrivalTime: '17:05',
            airline: 'United Airlines',
        });
    });

    it('trims + URL-encodes the number and forwards the date', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(flightLookupNoMatchFixture);
            })
        );
        await lookupFlight('  UA 123  ', '2026-09-01');
        const params = new URL(requestUrl).searchParams;
        expect(params.get('number')).toBe('UA 123');
        expect(params.get('date')).toBe('2026-09-01');
    });

    it('returns null on a no-match (result: null) payload', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(flightLookupNoMatchFixture)
            )
        );
        expect(await lookupFlight('UA123', '2026-09-01')).toBeNull();
    });

    it('returns null (not an error) on a backend 503 / non-OK', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 503 }))
        );
        expect(await lookupFlight('UA123', '2026-09-01')).toBeNull();
    });

    it('contract catches drift (missing envelope / extra field / wrong-typed)', () => {
        expect(() => FlightLookupWireContract.parse({})).toThrow();
        expect(() =>
            FlightLookupWireContract.parse({
                ...flightLookupResponseFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            FlightLookupWireContract.parse({
                result: {
                    ...flightLookupResponseFixture.result,
                    depart_airport: 42,
                },
            })
        ).toThrow();
    });
});
