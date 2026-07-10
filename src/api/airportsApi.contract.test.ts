import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { AirportsSearchWireContract } from '../test/contracts/airports.contract';
import {
    airportsResponseFixture,
    airportsEmptyFixture,
} from '../test/fixtures/airports';
import { searchAirports } from './airportsApi';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/airports/search`;

// Contract tests for the airport-autocomplete boundary: drive the REAL client
// through MSW (request-building + snake→camel reshaping are exercised) and pin
// the wire shape with a Zod contract.
describe('airportsApi contract — GET /airports/search', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            AirportsSearchWireContract.parse(airportsResponseFixture)
        ).not.toThrow();
        expect(() =>
            AirportsSearchWireContract.parse(airportsEmptyFixture)
        ).not.toThrow();
    });

    it('short-circuits to an empty list on a blank/whitespace query (no request)', async () => {
        // No handler is registered; onUnhandledRequest:'error' would fail the
        // test if a request slipped through — proving the guard returns early.
        expect(await searchAirports('   ')).toEqual({ items: [] });
    });

    it('maps the wire rows → camelCase AirportOption[]', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(airportsResponseFixture))
        );
        const res = await searchAirports('san');
        expect(res).toEqual({
            items: [
                {
                    iataCode: 'SFO',
                    name: 'San Francisco International',
                    city: 'San Francisco',
                    countryCode: 'US',
                    country: 'United States',
                },
                {
                    iataCode: 'JFK',
                    name: 'John F. Kennedy International',
                    city: 'New York',
                    countryCode: 'US',
                    country: 'United States',
                },
            ],
        });
    });

    it('trims + URL-encodes the query and sends the default limit=20', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(airportsEmptyFixture);
            })
        );
        await searchAirports('  new york  ');
        const params = new URL(requestUrl).searchParams;
        expect(params.get('q')).toBe('new york');
        expect(params.get('limit')).toBe('20');
    });

    it('forwards a custom limit', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(airportsEmptyFixture);
            })
        );
        await searchAirports('sfo', 5);
        expect(new URL(requestUrl).searchParams.get('limit')).toBe('5');
    });

    it('returns an empty list when the backend has no matches', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(airportsEmptyFixture))
        );
        expect(await searchAirports('zzz')).toEqual({ items: [] });
    });

    it('throws on a non-OK response', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        await expect(searchAirports('sfo')).rejects.toThrow(
            '/airports/search 500'
        );
    });

    it('contract catches drift (missing envelope / extra field / wrong-typed row)', () => {
        expect(() => AirportsSearchWireContract.parse({})).toThrow();
        expect(() =>
            AirportsSearchWireContract.parse({
                ...airportsResponseFixture,
                extra: 1,
            })
        ).toThrow();
        // Row missing `country` (and iata_code wrong-typed).
        expect(() =>
            AirportsSearchWireContract.parse({
                items: [
                    { iata_code: 7, name: 'x', city: 'y', country_code: 'US' },
                ],
            })
        ).toThrow();
    });
});
