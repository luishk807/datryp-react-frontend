import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    placeImageWireFixture,
    placeImageNoCreditWireFixture,
} from '../../test/fixtures/placeImage';
import { usePlaceImage } from './usePlaceImage';

const ENDPOINT = 'http://localhost:8000/places/image';

describe('usePlaceImage', () => {
    it('stays idle (no request) for an empty name', () => {
        const { result } = renderHookWithProviders(() =>
            usePlaceImage('   ', 'Paris', 'France')
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when explicitly disabled', () => {
        const { result } = renderHookWithProviders(() =>
            usePlaceImage('Eiffel Tower', 'Paris', 'France', {
                enabled: false,
            })
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the resolved image', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(placeImageWireFixture))
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceImage('Eiffel Tower', 'Paris', 'France')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            imageUrl: 'https://images.example.com/paris-hero.jpg',
            photographerName: 'Ansel Adams',
            photographerUrl: 'https://example.com/ansel',
            source: 'unsplash',
        });
    });

    it('passes through null attribution fields', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(placeImageNoCreditWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceImage('Kyoto', null, null)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toMatchObject({
            photographerName: null,
            photographerUrl: null,
            source: 'pexels',
        });
    });

    it('maps a 404 (no provider matched) to null', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 404 }))
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceImage('Nowhere', null, null)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('forwards name/city/country as query params', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(placeImageWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceImage('  Eiffel Tower  ', '  Paris  ', '  France  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('name')).toBe('Eiffel Tower');
        expect(params.get('city')).toBe('Paris');
        expect(params.get('country')).toBe('France');
    });

    it('surfaces an error on a non-404 backend failure', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceImage('Eiffel Tower', 'Paris', 'France')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
