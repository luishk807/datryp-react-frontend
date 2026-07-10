import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { tripSuggestionsRawFixture } from '../../test/fixtures/tripSuggestions';
import { useTripSuggestions } from './useTripSuggestions';

const BASE = 'http://localhost:8000';
const TRIP = 'trip-1';

describe('useTripSuggestions', () => {
    it('POSTs an empty body and reshapes the snake_case response', async () => {
        let method = '';
        let path = '';
        let body = '';
        server.use(
            http.post(
                `${BASE}/me/trip-suggestions/:id`,
                async ({ request }) => {
                    method = request.method;
                    path = new URL(request.url).pathname;
                    body = await request.text();
                    return HttpResponse.json(tripSuggestionsRawFixture);
                }
            )
        );
        const { result } = renderHookWithProviders(() => useTripSuggestions());

        await act(async () => {
            await result.current.mutateAsync({ tripId: TRIP });
        });

        await waitFor(() => expect(result.current.data).toBeDefined());
        expect(method).toBe('POST');
        expect(path).toBe('/me/trip-suggestions/trip-1');
        expect(body).toBe('{}');
        expect(result.current.data).toEqual({
            suggestions: [
                {
                    name: 'teamLab Planets',
                    place: 'Toyosu, Tokyo',
                    category: 'Museum',
                    why: 'Immersive digital-art rooms unlike anything back home.',
                    estimatedCostUsd: 32,
                    durationHours: 2,
                    imageUrl: 'https://images.unsplash.com/photo-teamlab',
                    photographerName: 'Jane Doe',
                    photographerUrl: 'https://unsplash.com/@janedoe',
                },
                {
                    name: 'Sunrise at a neighborhood shrine',
                    place: null,
                    category: null,
                    why: 'A quiet, free way to start the day like a local.',
                    estimatedCostUsd: null,
                    durationHours: null,
                    imageUrl: null,
                    photographerName: null,
                    photographerUrl: null,
                },
            ],
            dontForget: 'Carry cash — many small shops are cash-only.',
            quota: {
                used: 1,
                cap: 5,
                remaining: 4,
                resetsAt: '2026-07-11T00:00:00Z',
                window: 'day',
            },
        });
    });

    it('surfaces a backend error', async () => {
        server.use(
            http.post(
                `${BASE}/me/trip-suggestions/:id`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useTripSuggestions());

        await act(async () => {
            await result.current
                .mutateAsync({ tripId: TRIP })
                .catch(() => undefined);
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
