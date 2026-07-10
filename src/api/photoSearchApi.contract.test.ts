import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    photoSearchWireFixture,
    photoSearchNoCreditWireFixture,
    photoGalleryWireFixture,
} from 'test/fixtures/photoSearch';
import {
    PhotoSearchWireContract,
    PhotoGalleryWireContract,
} from 'test/contracts/photoSearch.contract';
import { fetchPhotoSearch, fetchPhotoGallery } from './photoSearchApi';

const API_BASE = 'http://localhost:8000';
const searchUrl = `${API_BASE}/photo-search`;
const galleryUrl = `${API_BASE}/photo-search/gallery`;

// Contract tests for the REST /photo-search boundary: drive the REAL client
// through MSW so query-building + snake→camel reshaping run, then validate the
// wire payloads against the Zod contracts.
describe('photoSearchApi contract — GET /photo-search', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            PhotoSearchWireContract.parse(photoSearchWireFixture)
        ).not.toThrow();
        expect(() =>
            PhotoSearchWireContract.parse(photoSearchNoCreditWireFixture)
        ).not.toThrow();
    });

    it('returns null and makes NO request for a blank query', async () => {
        const handler = vi.fn(() => HttpResponse.json(photoSearchWireFixture));
        server.use(http.get(searchUrl, handler));
        expect(await fetchPhotoSearch('   ')).toBeNull();
        expect(handler).not.toHaveBeenCalled();
    });

    it('reshapes a full payload and forwards the trimmed query', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(searchUrl, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(photoSearchWireFixture);
            })
        );
        const result = await fetchPhotoSearch('  Paris ');
        expect(params!.get('q')).toBe('Paris');
        expect(result).toEqual({
            imageUrl: photoSearchWireFixture.image_url,
            photographerName: photoSearchWireFixture.photographer_name,
            photographerUrl: photoSearchWireFixture.photographer_url,
        });
    });

    it('passes null photographer fields straight through', async () => {
        server.use(
            http.get(searchUrl, () =>
                HttpResponse.json(photoSearchNoCreditWireFixture)
            )
        );
        expect(await fetchPhotoSearch('Kyoto')).toEqual({
            imageUrl: photoSearchNoCreditWireFixture.image_url,
            photographerName: null,
            photographerUrl: null,
        });
    });

    it('maps a 404 no-match to null', async () => {
        server.use(
            http.get(searchUrl, () => new HttpResponse(null, { status: 404 }))
        );
        expect(await fetchPhotoSearch('Nowhere')).toBeNull();
    });

    it('throws a descriptive error on a non-OK (non-404) response', async () => {
        server.use(
            http.get(
                searchUrl,
                () =>
                    new HttpResponse(null, {
                        status: 500,
                        statusText: 'Internal Server Error',
                    })
            )
        );
        await expect(fetchPhotoSearch('Paris')).rejects.toThrow(
            /\/photo-search failed: 500/
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = { ...photoSearchWireFixture } as Record<
            string,
            unknown
        >;
        delete missing.image_url;
        expect(() => PhotoSearchWireContract.parse(missing)).toThrow();
        // Reflects that /photo-search carries NO `source` field.
        expect(() =>
            PhotoSearchWireContract.parse({
                ...photoSearchWireFixture,
                source: 'unsplash',
            })
        ).toThrow();
        expect(() =>
            PhotoSearchWireContract.parse({
                ...photoSearchWireFixture,
                image_url: 42,
            })
        ).toThrow();
    });
});

describe('photoSearchApi contract — GET /photo-search/gallery', () => {
    it('fixture satisfies the gallery wire contract', () => {
        expect(() =>
            PhotoGalleryWireContract.parse(photoGalleryWireFixture)
        ).not.toThrow();
    });

    it('returns [] and makes NO request for a blank query', async () => {
        const handler = vi.fn(() => HttpResponse.json(photoGalleryWireFixture));
        server.use(http.get(galleryUrl, handler));
        expect(await fetchPhotoGallery('   ')).toEqual([]);
        expect(handler).not.toHaveBeenCalled();
    });

    it('reshapes the photos list and forwards q + the default count', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(galleryUrl, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(photoGalleryWireFixture);
            })
        );
        const result = await fetchPhotoGallery('  Paris ');
        expect(params!.get('q')).toBe('Paris');
        expect(params!.get('count')).toBe('4');
        expect(result).toEqual([
            {
                imageUrl: photoSearchWireFixture.image_url,
                photographerName: photoSearchWireFixture.photographer_name,
                photographerUrl: photoSearchWireFixture.photographer_url,
            },
            {
                imageUrl: photoSearchNoCreditWireFixture.image_url,
                photographerName: null,
                photographerUrl: null,
            },
        ]);
    });

    it('forwards an explicit count', async () => {
        let params: URLSearchParams | null = null;
        server.use(
            http.get(galleryUrl, ({ request }) => {
                params = new URL(request.url).searchParams;
                return HttpResponse.json(photoGalleryWireFixture);
            })
        );
        await fetchPhotoGallery('Paris', 8);
        expect(params!.get('count')).toBe('8');
    });

    it('fails soft to [] on a non-OK response', async () => {
        server.use(
            http.get(galleryUrl, () => new HttpResponse(null, { status: 500 }))
        );
        expect(await fetchPhotoGallery('Paris')).toEqual([]);
    });

    it('maps a body without a photos array to [] (?? fallback)', async () => {
        server.use(http.get(galleryUrl, () => HttpResponse.json({})));
        expect(await fetchPhotoGallery('Paris')).toEqual([]);
    });
});
