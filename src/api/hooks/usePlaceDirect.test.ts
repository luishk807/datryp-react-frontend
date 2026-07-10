import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { placeDirectResponseWire } from '../../test/fixtures/placeRecommendations';
import { usePlaceDirect } from './usePlaceDirect';

const ENDPOINT = 'http://localhost:8000/place-direct';

describe('usePlaceDirect', () => {
    it('stays idle (no request) for a blank name', () => {
        const { result } = renderHookWithProviders(() =>
            usePlaceDirect('', 'Kyoto', 'Japan')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when explicitly disabled via options', () => {
        const { result } = renderHookWithProviders(() =>
            usePlaceDirect('Kyoto', 'Kyoto', 'Japan', { enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('resolves a known place into a one-item result', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(placeDirectResponseWire)
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceDirect('Kyoto', 'Kyoto', 'Japan')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.query).toBe('Kyoto, Japan');
        expect(result.current.data?.items).toHaveLength(1);
        expect(result.current.data?.items[0]).toMatchObject({
            name: 'Kyoto',
            countryCode: 'JP',
        });
    });

    it('forwards name / city / country query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(placeDirectResponseWire);
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceDirect('Kyoto', '  Kyoto  ', '  Japan  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('name')).toBe('Kyoto');
        expect(params.get('city')).toBe('Kyoto');
        expect(params.get('country')).toBe('Japan');
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceDirect('Kyoto', 'Kyoto', 'Japan')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
