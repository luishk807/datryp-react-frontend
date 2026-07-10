import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    photoSearchWireFixture,
    photoGalleryWireFixture,
} from '../../test/fixtures/photoSearch';
import { usePhotoSearch, usePhotoGallery } from './usePhotoSearch';

const SEARCH = 'http://localhost:8000/photo-search';
const GALLERY = 'http://localhost:8000/photo-search/gallery';

describe('usePhotoSearch', () => {
    it('stays idle (no request) for an empty query', () => {
        const { result } = renderHookWithProviders(() => usePhotoSearch('   '));
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('stays idle when explicitly disabled', () => {
        const { result } = renderHookWithProviders(() =>
            usePhotoSearch('Paris', { enabled: false })
        );
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the fallback photo', async () => {
        server.use(
            http.get(SEARCH, () => HttpResponse.json(photoSearchWireFixture))
        );
        const { result } = renderHookWithProviders(() =>
            usePhotoSearch('Paris')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            imageUrl: 'https://images.example.com/paris-hero.jpg',
            photographerName: 'Ansel Adams',
            photographerUrl: 'https://example.com/ansel',
        });
    });

    it('maps a 404 (no photo) to null', async () => {
        server.use(
            http.get(SEARCH, () => new HttpResponse(null, { status: 404 }))
        );
        const { result } = renderHookWithProviders(() =>
            usePhotoSearch('Nowhere')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toBeNull();
    });

    it('forwards the query param', async () => {
        let requestUrl = '';
        server.use(
            http.get(SEARCH, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(photoSearchWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePhotoSearch('  Paris  ')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('q')).toBe('Paris');
    });

    it('surfaces an error on a non-404 backend failure', async () => {
        server.use(
            http.get(SEARCH, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            usePhotoSearch('Paris')
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('usePhotoGallery', () => {
    it('stays idle (no request) for an empty query', () => {
        const { result } = renderHookWithProviders(() => usePhotoGallery('  '));
        expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches + reshapes the gallery list', async () => {
        server.use(
            http.get(GALLERY, () => HttpResponse.json(photoGalleryWireFixture))
        );
        const { result } = renderHookWithProviders(() =>
            usePhotoGallery('Paris')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0]).toEqual({
            imageUrl: 'https://images.example.com/paris-hero.jpg',
            photographerName: 'Ansel Adams',
            photographerUrl: 'https://example.com/ansel',
        });
    });

    it('forwards the query + count params', async () => {
        let requestUrl = '';
        server.use(
            http.get(GALLERY, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(photoGalleryWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePhotoGallery('Paris', 6)
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        const params = new URL(requestUrl).searchParams;
        expect(params.get('q')).toBe('Paris');
        expect(params.get('count')).toBe('6');
    });

    it('fails soft to an empty list on a backend failure', async () => {
        server.use(
            http.get(GALLERY, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            usePhotoGallery('Paris')
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });
});
