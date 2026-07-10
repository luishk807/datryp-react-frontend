import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    recommendationsResponseWire,
    placeRecommendationFixture,
} from '../../test/fixtures/placeRecommendations';
import { useSearchPlaces } from './useSearchPlaces';

const ENDPOINT = 'http://localhost:8000/place-recommendations';

describe('useSearchPlaces', () => {
    it('stays idle (no request) for an empty query', () => {
        const { result } = renderHookWithProviders(() => useSearchPlaces('   '));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when explicitly disabled', () => {
        const { result } = renderHookWithProviders(() =>
            useSearchPlaces('kyoto', 2, undefined, 'search', {
                enabled: false,
            })
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the recommendations page', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(recommendationsResponseWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useSearchPlaces('kyoto')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.query).toBe('kyoto');
        expect(result.current.data?.cached).toBe(false);
        expect(result.current.data?.items).toEqual([placeRecommendationFixture]);
        expect(result.current.data?.summary).toBe(
            'A one-line overview of the matches.'
        );
        expect(result.current.data?.relatedSearches).toEqual(['osaka', 'nara']);
    });

    it('sends the query + limit + lang params (no country/kind by default)', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(recommendationsResponseWire);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useSearchPlaces('kyoto', 5)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('q')).toBe('kyoto');
        expect(params.get('limit')).toBe('5');
        expect(params.get('lang')).toBeTruthy();
        expect(params.get('country')).toBeNull();
        expect(params.get('kind')).toBeNull();
    });

    it('forwards a trimmed country and the suggestion kind', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(recommendationsResponseWire);
            })
        );
        const { result } = renderHookWithProviders(() =>
            useSearchPlaces('kyoto', 2, '  Japan  ', 'suggestion')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('country')).toBe('Japan');
        expect(params.get('kind')).toBe('suggestion');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useSearchPlaces('kyoto')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
