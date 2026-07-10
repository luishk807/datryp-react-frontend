import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { TransitLookupWireContract } from '../test/contracts/transitLookup.contract';
import {
    transitLookupResponseFixture,
    transitLookupNoMatchFixture,
} from '../test/fixtures/transitLookup';
import { lookupTransit } from './transitLookupApi';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/transit/lookup`;

// Contract tests for the fail-soft transit-lookup boundary (mirrors flights):
// no-match / non-OK resolve to null so the form keeps the user's typed value.
describe('transitLookupApi contract — GET /transit/lookup', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            TransitLookupWireContract.parse(transitLookupResponseFixture)
        ).not.toThrow();
        expect(() =>
            TransitLookupWireContract.parse(transitLookupNoMatchFixture)
        ).not.toThrow();
    });

    it('maps the wire result → camelCase TransitLookupResult', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(transitLookupResponseFixture)
            )
        );
        expect(await lookupTransit('Amtrak', '2151', 'train')).toEqual({
            operator: 'Amtrak',
            number: '2151',
            departStation: 'New York Penn',
            arrivalStation: 'Washington Union',
            departTime: '09:05',
            arrivalTime: '12:35',
            departDate: '2026-09-01',
            arrivalDate: '2026-09-01',
            routeName: 'Acela',
        });
    });

    it('sends operator/number/kind and omits optional country + depart_date when not given', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(transitLookupNoMatchFixture);
            })
        );
        await lookupTransit('Amtrak', '2151', 'train');
        const params = new URL(requestUrl).searchParams;
        expect(params.get('operator')).toBe('Amtrak');
        expect(params.get('number')).toBe('2151');
        expect(params.get('kind')).toBe('train');
        expect(params.has('country')).toBe(false);
        expect(params.has('depart_date')).toBe(false);
    });

    it('includes optional country + depart_date when provided', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(transitLookupNoMatchFixture);
            })
        );
        await lookupTransit('Renfe', 'AVE123', 'train', 'ES', '2026-09-02');
        const params = new URL(requestUrl).searchParams;
        expect(params.get('country')).toBe('ES');
        expect(params.get('depart_date')).toBe('2026-09-02');
        expect(params.get('kind')).toBe('train');
    });

    it('returns null on a no-match (result: null) payload', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(transitLookupNoMatchFixture)
            )
        );
        expect(await lookupTransit('Amtrak', '9999', 'bus')).toBeNull();
    });

    it('returns null (not an error) on a non-OK response', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        expect(await lookupTransit('Amtrak', '2151', 'train')).toBeNull();
    });

    it('contract catches drift (missing envelope / extra field / wrong-typed)', () => {
        expect(() => TransitLookupWireContract.parse({})).toThrow();
        expect(() =>
            TransitLookupWireContract.parse({
                ...transitLookupResponseFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            TransitLookupWireContract.parse({
                result: {
                    ...transitLookupResponseFixture.result,
                    depart_station: 42,
                },
            })
        ).toThrow();
    });
});
