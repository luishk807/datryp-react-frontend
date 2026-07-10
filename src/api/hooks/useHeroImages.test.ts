import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import {
    heroImagesResponseFixture,
    heroImagesEmptyFixture,
} from '../../test/fixtures/heroImages';
import { useHeroImages } from './useHeroImages';

const ENDPOINT = 'http://localhost:8000/hero-images';

describe('useHeroImages', () => {
    it('fetches + reshapes the hero list from snake_case to camelCase', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(heroImagesResponseFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useHeroImages());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0]).toEqual({
            id: 'hero-tokyo',
            city: 'Tokyo',
            imageUrl: 'https://images.example.com/tokyo.jpg',
            source: 'unsplash',
            photographerName: 'Ansel Adams',
            photographerUrl: 'https://example.com/ansel',
        });
    });

    it('maps an empty envelope to an empty array', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(heroImagesEmptyFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useHeroImages());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual([]);
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() => useHeroImages());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
