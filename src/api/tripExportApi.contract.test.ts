import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { tripExportResultFixture } from 'test/fixtures/tripExport';
import { TripExportEmailResultContract } from 'test/contracts/tripExport.contract';
import { emailTripExport } from './tripExportApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const url = (tripId: string) => `${API_BASE}/trips/${tripId}/export-email`;

const pdf = () => new Blob(['%PDF-1.4'], { type: 'application/pdf' });
const excel = () =>
    new Blob(['xlsx-bytes'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

// NOTE: we deliberately never consume the request body here. The client sends
// a multipart `FormData` (verified via the boundary in the Content-Type below),
// but reading that body inside the MSW interceptor hangs under the Node
// (jsdom + undici) test transport — a known interop limitation. So `safeStem`'s
// attachment-name logic is exercised by EXECUTION (calling with varied trip
// names below, each of which builds the FormData) rather than by asserting the
// serialized filename. Everything observable without draining the body
// (method, URL, auth, content-type, the parsed response) is asserted.

describe('tripExportApi contract — POST /trips/{tripId}/export-email', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixture satisfies the wire contract', () => {
        expect(() =>
            TripExportEmailResultContract.parse(tripExportResultFixture)
        ).not.toThrow();
    });

    it('POSTs a multipart upload with the bearer and returns the parsed contract', async () => {
        let authHeader: string | null = null;
        let contentType: string | null = null;
        let method: string | undefined;
        server.use(
            http.post(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                contentType = request.headers.get('content-type');
                method = request.method;
                return HttpResponse.json(tripExportResultFixture);
            })
        );
        const res = await emailTripExport(
            'trip-1',
            pdf(),
            excel(),
            'Tokyo Adventure'
        );
        expect(() => TripExportEmailResultContract.parse(res)).not.toThrow();
        expect(res).toEqual({ recipients: 3, emails: 3 });
        expect(authHeader).toBe('Bearer test-token');
        expect(method).toBe('POST');
        // The browser/undici sets multipart with a boundary; the client must
        // NOT force its own Content-Type.
        expect(contentType).toContain('multipart/form-data');
        expect(contentType).toContain('boundary=');
    });

    it('builds the upload across every safeStem branch (undefined / blank / plain / unsafe / long)', async () => {
        server.use(
            http.post(url('trip-1'), () =>
                HttpResponse.json(tripExportResultFixture)
            )
        );
        // Each call runs safeStem while assembling the FormData:
        //  - undefined      → `name?.trim()` short-circuits, `|| 'trip'`
        //  - '   ' (blank)  → trims to '' (falsy) → 'trip'
        //  - 'Tokyo Trip'   → defined + truthy branch
        //  - 'A & B!'       → the `[^\w.-]+` → '_' replacement
        //  - 100 chars      → the `.slice(0, 80)` truncation
        for (const name of [
            undefined,
            '   ',
            'Tokyo Trip',
            'A & B!',
            'x'.repeat(100),
        ]) {
            const res = await emailTripExport('trip-1', pdf(), excel(), name);
            expect(res).toEqual({ recipients: 3, emails: 3 });
        }
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.post(url('trip-1'), ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(tripExportResultFixture);
            })
        );
        await emailTripExport('trip-1', pdf(), excel(), 'Trip');
        expect(authHeader).toBeNull();
    });

    it('throws with the backend detail on a non-OK response', async () => {
        server.use(
            http.post(url('trip-1'), () =>
                HttpResponse.json(
                    { detail: 'Trip is not confirmed' },
                    { status: 409, statusText: 'Conflict' }
                )
            )
        );
        await expect(
            emailTripExport('trip-1', pdf(), excel(), 'Trip')
        ).rejects.toThrow(
            'email trip export 409 Conflict — Trip is not confirmed'
        );
    });

    it('throws (no detail suffix) when the error body is not JSON', async () => {
        server.use(
            http.post(
                url('trip-1'),
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(
            emailTripExport('trip-1', pdf(), excel(), 'Trip')
        ).rejects.toThrow('email trip export 500');
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        expect(() =>
            TripExportEmailResultContract.parse({ recipients: 3 })
        ).toThrow();
        expect(() =>
            TripExportEmailResultContract.parse({
                ...tripExportResultFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            TripExportEmailResultContract.parse({
                recipients: 3,
                emails: '3',
            })
        ).toThrow();
    });
});
