import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { travelAdvisoryResponseFixture } from 'test/fixtures/travelAdvisory';
import { TravelAdvisoryWireContract } from 'test/contracts/travelAdvisory.contract';
import { fetchTravelAdvisory } from './travelAdvisoryApi';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/travel-advisory`;

// Contract tests for the REST /travel-advisory boundary: drive the REAL client
// through MSW so query-building + snake→camel reshaping run. This endpoint is
// best-effort — a 204 / error / bad body all fail soft to null so the widget
// hides — so those branches are pinned explicitly.
describe('travelAdvisoryApi contract — GET /travel-advisory', () => {
    it('fixture satisfies the wire contract', () => {
        expect(() =>
            TravelAdvisoryWireContract.parse(travelAdvisoryResponseFixture)
        ).not.toThrow();
    });

    it('reshapes a 200 and forwards destination/source query params', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(url, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(travelAdvisoryResponseFixture);
            })
        );
        const result = await fetchTravelAdvisory('MX', 'US');
        expect(params!.get('destination')).toBe('MX');
        expect(params!.get('source')).toBe('US');
        expect(result).toEqual({
            destinationCode: 'MX',
            sourceCode: 'US',
            sourceName: 'U.S. Department of State',
            url: 'https://travel.state.gov/mexico',
            level: 2,
            label: 'Exercise Increased Caution',
            updated: '2026-06-01',
        });
    });

    it('maps a 204 (no curated level) to null', async () => {
        server.use(http.get(url, () => new HttpResponse(null, { status: 204 })));
        expect(await fetchTravelAdvisory('MX', 'US')).toBeNull();
    });

    it('maps a non-OK error response to null (fail-soft)', async () => {
        server.use(http.get(url, () => new HttpResponse(null, { status: 500 })));
        expect(await fetchTravelAdvisory('MX', 'US')).toBeNull();
    });

    it('maps a malformed (non-JSON) 200 body to null via the catch', async () => {
        server.use(
            http.get(
                url,
                () =>
                    new HttpResponse('not json', {
                        status: 200,
                        headers: { 'content-type': 'text/plain' },
                    })
            )
        );
        expect(await fetchTravelAdvisory('MX', 'US')).toBeNull();
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = {
            ...travelAdvisoryResponseFixture,
        } as Record<string, unknown>;
        delete missing.source_name;
        expect(() => TravelAdvisoryWireContract.parse(missing)).toThrow();
        expect(() =>
            TravelAdvisoryWireContract.parse({
                ...travelAdvisoryResponseFixture,
                surprise: true,
            })
        ).toThrow();
        expect(() =>
            TravelAdvisoryWireContract.parse({
                ...travelAdvisoryResponseFixture,
                level: '2',
            })
        ).toThrow();
    });
});
