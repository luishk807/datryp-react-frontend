import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import { renderHookWithProviders } from '../../test/renderWithProviders';
import { tripExportResultFixture } from '../../test/fixtures/tripExport';
import { useEmailTripExport } from './useEmailTripExport';

const BASE = 'http://localhost:8000';
const TRIP = 'trip-5';

const pdf = () => new Blob(['pdf-bytes'], { type: 'application/pdf' });
const excel = () =>
    new Blob(['xlsx-bytes'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

// The handler deliberately does NOT read the request body: consuming a
// multipart FormData stream hangs under jsdom+undici here. The hook is a pure
// pass-through to `emailTripExport`, so asserting method + URL + reshaped
// result + error covers the hook layer; the safeStem filename mapping is a
// client-internal detail (src/api/tripExportApi.ts, its own coverage scope).
describe('useEmailTripExport', () => {
    it('POSTs the export to the trip email endpoint and returns the reach summary', async () => {
        let method = '';
        let path = '';
        server.use(
            http.post(`${BASE}/trips/:id/export-email`, ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                return HttpResponse.json(tripExportResultFixture);
            })
        );
        const { result } = renderHookWithProviders(() => useEmailTripExport());

        await act(async () => {
            await result.current.mutateAsync({
                tripId: TRIP,
                pdf: pdf(),
                excel: excel(),
                tripName: 'My Tokyo Trip!',
            });
        });

        await waitFor(() =>
            expect(result.current.data).toEqual(tripExportResultFixture)
        );
        expect(method).toBe('POST');
        expect(path).toBe('/trips/trip-5/export-email');
    });

    it('works without a trip name (default attachment stem)', async () => {
        server.use(
            http.post(`${BASE}/trips/:id/export-email`, () =>
                HttpResponse.json(tripExportResultFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useEmailTripExport());

        await act(async () => {
            await result.current.mutateAsync({
                tripId: TRIP,
                pdf: pdf(),
                excel: excel(),
            });
        });

        await waitFor(() =>
            expect(result.current.data).toEqual(tripExportResultFixture)
        );
    });

    it('surfaces a backend error', async () => {
        server.use(
            http.post(
                `${BASE}/trips/:id/export-email`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useEmailTripExport());

        await act(async () => {
            await result.current
                .mutateAsync({ tripId: TRIP, pdf: pdf(), excel: excel() })
                .catch(() => undefined);
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
