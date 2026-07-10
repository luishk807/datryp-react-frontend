import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    fullFactsWireFixture,
    minimalFactsWireFixture,
} from '../../test/fixtures/countryFacts';
import { useCountryFacts } from './useCountryFacts';

const ENDPOINT = 'http://localhost:8000/country-facts';

describe('useCountryFacts', () => {
    it('stays idle (no request) for a blank / too-short code', () => {
        const { result } = renderHookWithProviders(() => useCountryFacts('J'));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('fetches + reshapes the full curated facts payload', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(fullFactsWireFixture))
        );
        const { result } = renderHookWithProviders(() => useCountryFacts('JP'));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            countryCode: 'JP',
            timezone: 'Asia/Tokyo',
            timezoneMulti: false,
            source: 'curated',
        });
        expect(result.current.data?.power).toMatchObject({ plugs: ['A', 'B'] });
        expect(result.current.data?.religion?.main).toBe('Shinto & Buddhism');
        expect(result.current.data?.greatFor).toEqual(['food', 'culture']);
    });

    it('applies null/empty defaults on a minimal payload', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(minimalFactsWireFixture))
        );
        const { result } = renderHookWithProviders(() => useCountryFacts('XY'));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            countryCode: 'XY',
            power: null,
            timezone: null,
            timezoneMulti: true,
            source: 'curated',
        });
        expect(result.current.data?.greatFor).toEqual([]);
        expect(result.current.data?.festivals).toEqual([]);
    });

    it('resolves to null when the country is not curated (204)', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 204 }))
        );
        const { result } = renderHookWithProviders(() => useCountryFacts('ZZ'));
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('uppercases + trims the code into the query param', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(fullFactsWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useCountryFacts('  jp  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('code')).toBe('JP');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useCountryFacts('JP'));
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
