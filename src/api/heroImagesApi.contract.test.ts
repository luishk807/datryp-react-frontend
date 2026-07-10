import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    heroImagesResponseFixture,
    heroImagesEmptyFixture,
} from 'test/fixtures/heroImages';
import { HeroImagesResponseContract } from 'test/contracts/heroImages.contract';
import { fetchHeroImages } from './heroImagesApi';

const API_BASE = 'http://localhost:8000';
const url = `${API_BASE}/hero-images`;

// Contract tests for the REST /hero-images boundary: drive the REAL client
// through MSW so request-building + per-item snake→camel reshaping run, then
// validate the wire envelope against the Zod contract.
describe('heroImagesApi contract — GET /hero-images', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            HeroImagesResponseContract.parse(heroImagesResponseFixture)
        ).not.toThrow();
        expect(() =>
            HeroImagesResponseContract.parse(heroImagesEmptyFixture)
        ).not.toThrow();
    });

    it('reshapes every item snake→camel', async () => {
        let method: string | undefined;
        server.use(
            http.get(url, ({ request }) => {
                method = request.method;
                return HttpResponse.json(heroImagesResponseFixture);
            })
        );
        const result = await fetchHeroImages();
        expect(method).toBe('GET');
        expect(result).toEqual([
            {
                id: 'hero-tokyo',
                city: 'Tokyo',
                imageUrl: 'https://images.example.com/tokyo.jpg',
                source: 'unsplash',
                photographerName: 'Ansel Adams',
                photographerUrl: 'https://example.com/ansel',
            },
            {
                id: 'hero-paris',
                city: 'Paris',
                imageUrl: 'https://images.example.com/paris.jpg',
                source: 'unsplash',
                photographerName: 'Dorothea Lange',
                photographerUrl: 'https://example.com/dorothea',
            },
        ]);
    });

    it('maps an empty envelope to an empty list', async () => {
        server.use(http.get(url, () => HttpResponse.json(heroImagesEmptyFixture)));
        expect(await fetchHeroImages()).toEqual([]);
    });

    it('throws a descriptive error on a non-OK response', async () => {
        server.use(
            http.get(
                url,
                () =>
                    new HttpResponse(null, {
                        status: 500,
                        statusText: 'Internal Server Error',
                    })
            )
        );
        await expect(fetchHeroImages()).rejects.toThrow(
            /\/hero-images failed: 500 Internal Server Error/
        );
    });

    it('contract catches drift (missing / extra / wrong-typed item field)', () => {
        const missing = {
            items: [
                (() => {
                    const item = {
                        ...heroImagesResponseFixture.items[0],
                    } as Record<string, unknown>;
                    delete item.image_url;
                    return item;
                })(),
            ],
        };
        expect(() => HeroImagesResponseContract.parse(missing)).toThrow();
        expect(() =>
            HeroImagesResponseContract.parse({
                items: [
                    { ...heroImagesResponseFixture.items[0], mystery: true },
                ],
            })
        ).toThrow();
        expect(() =>
            HeroImagesResponseContract.parse({
                items: [{ ...heroImagesResponseFixture.items[0], source: 42 }],
            })
        ).toThrow();
        expect(() =>
            HeroImagesResponseContract.parse({ items: 'not-an-array' })
        ).toThrow();
    });
});
