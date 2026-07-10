import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    flightDepartureFixture,
    flightDeparturesFixture,
    flightDeparturesEmptyFixture,
} from 'test/fixtures/flightDepartures';
import {
    FlightDepartureContract,
    FlightDeparturesContract,
} from 'test/contracts/flightDepartures.contract';
import { searchFlightDepartures } from './flightDeparturesApi';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/flights/departures`;

describe('flightDeparturesApi contract — GET /flights/departures', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            FlightDeparturesContract.parse(flightDeparturesFixture)
        ).not.toThrow();
        expect(() =>
            FlightDepartureContract.parse(flightDepartureFixture)
        ).not.toThrow();
    });

    it('reshapes snake_case rows → camelCase options', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(flightDeparturesFixture))
        );
        const res = await searchFlightDepartures({
            airport: 'ewr',
            date: '2026-08-01',
        });
        expect(res).toHaveLength(2);
        expect(res[0]).toEqual({
            flightNumber: 'CM806',
            airline: 'Copa Airlines',
            airlineIata: 'CM',
            departAirport: 'EWR',
            departDate: '2026-08-01',
            departTime: '08:15',
            arrivalAirport: 'PTY',
            arrivalAirportName: 'Tocumen Intl',
            arrivalDate: '2026-08-01',
            arrivalTime: '13:40',
            aircraft: 'Boeing 737-800',
        });
        expect(res[1].flightNumber).toBeNull();
    });

    it('uppercases + trims airport and forwards all optional filters', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(flightDeparturesEmptyFixture);
            })
        );
        await searchFlightDepartures({
            airport: '  ewr ',
            date: '2026-08-01',
            fromTime: '06:00',
            airline: ' cm ',
            arrival: ' pty ',
        });
        expect(params!.get('airport')).toBe('EWR');
        expect(params!.get('date')).toBe('2026-08-01');
        expect(params!.get('from_time')).toBe('06:00');
        expect(params!.get('airline')).toBe('CM');
        expect(params!.get('arrival')).toBe('PTY');
    });

    it('omits optional params when not provided / whitespace-only', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(flightDeparturesEmptyFixture);
            })
        );
        await searchFlightDepartures({
            airport: 'JFK',
            date: '2026-09-01',
            airline: '   ', // whitespace-only → falsy after trim
            arrival: '   ',
        });
        expect(params!.has('from_time')).toBe(false);
        expect(params!.has('airline')).toBe(false);
        expect(params!.has('arrival')).toBe(false);
    });

    it('returns [] fail-soft on a non-OK response', async () => {
        server.use(http.get(ENDPOINT, () => new HttpResponse(null, { status: 429 })));
        expect(
            await searchFlightDepartures({ airport: 'EWR', date: '2026-08-01' })
        ).toEqual([]);
    });

    it('returns [] when the response omits items', async () => {
        server.use(http.get(ENDPOINT, () => HttpResponse.json({})));
        expect(
            await searchFlightDepartures({ airport: 'EWR', date: '2026-08-01' })
        ).toEqual([]);
    });

    it('returns [] for an explicitly empty item list', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(flightDeparturesEmptyFixture))
        );
        expect(
            await searchFlightDepartures({ airport: 'EWR', date: '2026-08-01' })
        ).toEqual([]);
    });

    it('contract catches a MISSING required field (backend drift)', () => {
        const missing = { ...flightDepartureFixture } as Record<string, unknown>;
        delete missing.flight_number;
        expect(() => FlightDepartureContract.parse(missing)).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            FlightDepartureContract.parse({ ...flightDepartureFixture, gate: 'A1' })
        ).toThrow();
    });

    it('contract catches a WRONG-typed field (number where string|null)', () => {
        expect(() =>
            FlightDepartureContract.parse({
                ...flightDepartureFixture,
                airline: 7,
            })
        ).toThrow();
    });
});
