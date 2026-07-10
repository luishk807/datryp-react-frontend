import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { useExtractLink } from './useExtractLink';

const ENDPOINT = 'http://localhost:8000/places/extract-link';
const URL_INPUT = 'https://hotel.example/room';

const extractedRawFixture = {
    name: 'Grand Hotel',
    street_address: '1 Ocean Ave',
    city: 'Panama City',
    region: 'Panama',
    country: 'PA',
    postal_code: '0801',
    latitude: 8.98,
    longitude: -79.52,
    image_url: 'https://img.example/hotel.jpg',
    source: 'jsonld',
} as const;

describe('useExtractLink', () => {
    it('stays idle (no request) for an empty url', () => {
        const { result } = renderHookWithProviders(() => useExtractLink('   '));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when explicitly disabled', () => {
        const { result } = renderHookWithProviders(() =>
            useExtractLink(URL_INPUT, { enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the extracted place (snake → camel)', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json({ result: extractedRawFixture })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useExtractLink(URL_INPUT)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            name: 'Grand Hotel',
            streetAddress: '1 Ocean Ave',
            city: 'Panama City',
            region: 'Panama',
            country: 'PA',
            postalCode: '0801',
            latitude: 8.98,
            longitude: -79.52,
            imageUrl: 'https://img.example/hotel.jpg',
        });
    });

    it('returns null when nothing extractable came back', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json({ result: null }))
        );
        const { result } = renderHookWithProviders(() =>
            useExtractLink(URL_INPUT)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('forwards the trimmed url as a query param', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json({ result: null });
            })
        );
        const { result } = renderHookWithProviders(() =>
            useExtractLink(`  ${URL_INPUT}  `)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('url')).toBe(URL_INPUT);
    });

    it('swallows a backend failure into a null result', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            useExtractLink(URL_INPUT)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });
});
