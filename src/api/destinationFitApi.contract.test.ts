import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { DestinationFitWireContract } from '../test/contracts/destinationFit.contract';
import { destinationFitWireFixture } from '../test/fixtures/destinationFit';
import { fetchDestinationFit } from './destinationFitApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/me/destination-fit`;

// Contract tests for the Pro "personal take" boundary: drive the REAL client
// through MSW so param building, the bearer-token gate, `.trim()`, and the
// best-effort null-on-anything reshape are all exercised.
describe('destinationFitApi contract — GET /me/destination-fit', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixture satisfies the wire contract', () => {
        expect(() =>
            DestinationFitWireContract.parse(destinationFitWireFixture)
        ).not.toThrow();
    });

    it('returns null and makes NO request when signed out', async () => {
        setAuthToken(null);
        const handler = vi.fn(() =>
            HttpResponse.json(destinationFitWireFixture)
        );
        server.use(http.get(url, handler));
        expect(
            await fetchDestinationFit({ name: 'Kyoto', kind: 'city' })
        ).toBeNull();
        expect(handler).not.toHaveBeenCalled();
    });

    it('trims the opinion, forwards name/country/kind + bearer token', async () => {
        let params: URLSearchParams | null = null;
        let authHeader: string | null = null;
        server.use(
            http.get(url, ({ request }) => {
                params = new URL(request.url).searchParams;
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(destinationFitWireFixture);
            })
        );
        const opinion = await fetchDestinationFit({
            name: 'Kyoto',
            country: 'Japan',
            kind: 'city',
        });
        expect(params!.get('name')).toBe('Kyoto');
        expect(params!.get('country')).toBe('Japan');
        expect(params!.get('kind')).toBe('city');
        expect(authHeader).toBe('Bearer test-token');
        expect(opinion).toBe(destinationFitWireFixture.opinion.trim());
    });

    it('defaults an omitted country to an empty param', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(url, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(destinationFitWireFixture);
            })
        );
        await fetchDestinationFit({ name: 'Japan', kind: 'country' });
        expect(params!.get('country')).toBe('');
        expect(params!.get('kind')).toBe('country');
    });

    it('maps a 204 (free / cap-hit / empty) to null', async () => {
        server.use(
            http.get(url, () => new HttpResponse(null, { status: 204 }))
        );
        expect(
            await fetchDestinationFit({ name: 'Kyoto', kind: 'city' })
        ).toBeNull();
    });

    it('maps a 402 non-OK to null', async () => {
        server.use(
            http.get(url, () => new HttpResponse(null, { status: 402 }))
        );
        expect(
            await fetchDestinationFit({ name: 'Kyoto', kind: 'city' })
        ).toBeNull();
    });

    it('maps a blank / whitespace-only opinion to null', async () => {
        server.use(
            http.get(url, () => HttpResponse.json({ opinion: '   ' }))
        );
        expect(
            await fetchDestinationFit({ name: 'Kyoto', kind: 'city' })
        ).toBeNull();
    });

    it('maps a missing opinion field to null', async () => {
        server.use(http.get(url, () => HttpResponse.json({})));
        expect(
            await fetchDestinationFit({ name: 'Kyoto', kind: 'city' })
        ).toBeNull();
    });

    it('swallows a network/transport error and returns null', async () => {
        server.use(http.get(url, () => HttpResponse.error()));
        expect(
            await fetchDestinationFit({ name: 'Kyoto', kind: 'city' })
        ).toBeNull();
    });

    it('contract catches drift (extra / wrong-typed)', () => {
        expect(() =>
            DestinationFitWireContract.parse({
                ...destinationFitWireFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            DestinationFitWireContract.parse({ opinion: 42 })
        ).toThrow();
    });
});
