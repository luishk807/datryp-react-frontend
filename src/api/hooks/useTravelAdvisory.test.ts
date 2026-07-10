import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { travelAdvisoryResponseFixture } from '../../test/fixtures/travelAdvisory';
import { useTravelAdvisory } from './useTravelAdvisory';

const ENDPOINT = 'http://localhost:8000/travel-advisory';

describe('useTravelAdvisory', () => {
    it('stays idle (no request) until both destination and source are known', () => {
        const { result } = renderHookWithProviders(() =>
            useTravelAdvisory('MX', null)
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when the destination is undefined', () => {
        const { result } = renderHookWithProviders(() =>
            useTravelAdvisory(undefined, 'US')
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the advisory for a destination / source pair', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(travelAdvisoryResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useTravelAdvisory('MX', 'US')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            destinationCode: 'MX',
            sourceCode: 'US',
            sourceName: 'U.S. Department of State',
            url: 'https://travel.state.gov/mexico',
            level: 2,
            label: 'Exercise Increased Caution',
            updated: '2026-06-01',
        });
    });

    it('forwards destination + source query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(travelAdvisoryResponseFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useTravelAdvisory('MX', 'US')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('destination')).toBe('MX');
        expect(params.get('source')).toBe('US');
    });

    it('is best-effort: a backend error resolves to null, not an error state', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useTravelAdvisory('MX', 'US')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
        expect(result.current.isError).toBe(false);
    });
});
