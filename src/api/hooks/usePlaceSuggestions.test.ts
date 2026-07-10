import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { placeSuggestionsWireFixture } from '../../test/fixtures/placeSuggestions';
import { activeLang } from 'i18n';
import { usePlaceSuggestions } from './usePlaceSuggestions';

let mockUser: { id: string } | null = { id: 'u1' };
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

const ENDPOINT = 'http://localhost:8000/me/place-suggestions';

beforeEach(() => {
    mockUser = { id: 'u1' };
});

describe('usePlaceSuggestions', () => {
    it('fetches + reshapes the suggestion array when signed in', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json(placeSuggestionsWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceSuggestions()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toHaveLength(2);
        expect(result.current.data?.[0]).toMatchObject({
            name: 'Lisbon',
            countryCode: 'PT',
            latitude: 38.7223,
        });
        // Null image/coords passthrough on the second item.
        expect(result.current.data?.[1]).toMatchObject({
            name: 'Oaxaca',
            imageUrl: null,
            photographerName: null,
        });
    });

    it('forwards the active language to the backend', async () => {
        let requestUrl = '';
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                requestUrl = request.url;
                return HttpResponse.json(placeSuggestionsWireFixture);
            })
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceSuggestions()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(new URL(requestUrl).searchParams.get('lang')).toBe(activeLang());
    });

    it('is disabled when logged out (no request)', () => {
        mockUser = null;
        const { result } = renderHookWithProviders(() =>
            usePlaceSuggestions()
        );
        expect(result.current.fetchStatus).toBe('idle');
        expect(result.current.data).toBeUndefined();
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse(null, { status: 500 }))
        );
        const { result } = renderHookWithProviders(() =>
            usePlaceSuggestions()
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
