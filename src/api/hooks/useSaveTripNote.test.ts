import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    tripNoteFixture,
    tripNoteNullFixture,
} from '../../test/fixtures/tripNote';
import { useSaveTripNote } from './useSaveTripNote';

const BASE = 'http://localhost:8000';
const TRIP = 'trip-8';

describe('useSaveTripNote', () => {
    it('PUTs the note and invalidates the itineraries list', async () => {
        let method = '';
        let path = '';
        let body: unknown = null;
        server.use(
            http.put(`${BASE}/me/trip-note/:id`, async ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                body = await request.json();
                return HttpResponse.json(tripNoteFixture);
            })
        );
        const client = makeTestQueryClient();
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
        const { result } = renderHookWithProviders(() => useSaveTripNote(), {
            client,
        });

        await act(async () => {
            await result.current.mutateAsync({
                tripId: TRIP,
                note: tripNoteFixture.note,
            });
        });

        await waitFor(() =>
            expect(result.current.data).toEqual(tripNoteFixture)
        );
        expect(method).toBe('PUT');
        expect(path).toBe('/me/trip-note/trip-8');
        expect(body).toEqual({ note: tripNoteFixture.note });
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ['myItineraries'],
        });
    });

    it('clears the note with a null body', async () => {
        let body: unknown = null;
        server.use(
            http.put(`${BASE}/me/trip-note/:id`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(tripNoteNullFixture);
            })
        );
        const { result } = renderHookWithProviders(() => useSaveTripNote());

        await act(async () => {
            await result.current.mutateAsync({ tripId: TRIP, note: null });
        });

        await waitFor(() =>
            expect(result.current.data).toEqual(tripNoteNullFixture)
        );
        expect(body).toEqual({ note: null });
    });

    it('surfaces a backend error', async () => {
        server.use(
            http.put(
                `${BASE}/me/trip-note/:id`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useSaveTripNote());

        await act(async () => {
            await result.current
                .mutateAsync({ tripId: TRIP, note: 'x' })
                .catch(() => undefined);
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
