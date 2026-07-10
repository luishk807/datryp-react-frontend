import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    freeEverythingActiveFixture,
    freeEverythingOffFixture,
} from 'test/fixtures/adminSettings';
import { FreeEverythingStatusContract } from 'test/contracts/adminSettings.contract';
import { fetchFreeEverything, updateFreeEverything } from './adminSettingsApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const URL = `${API_BASE}/admin/settings/free-everything`;

describe('adminSettingsApi contract — /admin/settings/free-everything', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            FreeEverythingStatusContract.parse(freeEverythingActiveFixture)
        ).not.toThrow();
        expect(() =>
            FreeEverythingStatusContract.parse(freeEverythingOffFixture)
        ).not.toThrow();
    });

    describe('fetchFreeEverything (GET)', () => {
        it('returns the mapped status and sends the bearer token', async () => {
            let authHeader: string | null = null;
            server.use(
                http.get(URL, ({ request }) => {
                    authHeader = request.headers.get('authorization');
                    return HttpResponse.json(freeEverythingActiveFixture);
                })
            );
            const res = await fetchFreeEverything();
            expect(res).toEqual({
                active: true,
                until: '2026-12-31T23:59:59Z',
            });
            expect(authHeader).toBe('Bearer test-token');
        });

        it('omits Authorization when no token is stored', async () => {
            setAuthToken(null);
            let authHeader: string | null = 'sentinel';
            server.use(
                http.get(URL, ({ request }) => {
                    authHeader = request.headers.get('authorization');
                    return HttpResponse.json(freeEverythingOffFixture);
                })
            );
            await fetchFreeEverything();
            expect(authHeader).toBeNull();
        });

        it('throws on a non-OK response', async () => {
            server.use(http.get(URL, () => new HttpResponse(null, { status: 403 })));
            await expect(fetchFreeEverything()).rejects.toThrow(
                /\/admin\/settings\/free-everything 403/
            );
        });
    });

    describe('updateFreeEverything (POST)', () => {
        it('sends only { enabled } when no duration/until given', async () => {
            let body: unknown;
            server.use(
                http.post(URL, async ({ request }) => {
                    body = await request.json();
                    return HttpResponse.json(freeEverythingActiveFixture);
                })
            );
            const res = await updateFreeEverything({ enabled: true });
            expect(body).toEqual({ enabled: true });
            expect(res.active).toBe(true);
        });

        it('maps durationHours → duration_hours (incl. explicit null)', async () => {
            let body: unknown;
            server.use(
                http.post(URL, async ({ request }) => {
                    body = await request.json();
                    return HttpResponse.json(freeEverythingActiveFixture);
                })
            );
            await updateFreeEverything({ enabled: true, durationHours: 48 });
            expect(body).toEqual({ enabled: true, duration_hours: 48 });

            await updateFreeEverything({ enabled: false, durationHours: null });
            expect(body).toEqual({ enabled: false, duration_hours: null });
        });

        it('maps untilIso → until_iso', async () => {
            let body: unknown;
            server.use(
                http.post(URL, async ({ request }) => {
                    body = await request.json();
                    return HttpResponse.json(freeEverythingActiveFixture);
                })
            );
            await updateFreeEverything({
                enabled: true,
                untilIso: '2026-11-01T00:00:00Z',
            });
            expect(body).toEqual({
                enabled: true,
                until_iso: '2026-11-01T00:00:00Z',
            });
        });

        it('throws with the backend detail on a non-OK response', async () => {
            server.use(
                http.post(URL, () =>
                    HttpResponse.json({ detail: 'not an admin' }, { status: 403 })
                )
            );
            await expect(
                updateFreeEverything({ enabled: true })
            ).rejects.toThrow('/admin/settings/free-everything 403 — not an admin');
        });

        it('throws a status-only error when the error body is not JSON', async () => {
            server.use(
                http.post(URL, () => new HttpResponse('x', { status: 500 }))
            );
            await expect(
                updateFreeEverything({ enabled: true })
            ).rejects.toThrow(/\/admin\/settings\/free-everything 500/);
        });
    });

    it('contract catches a MISSING required field (backend drift)', () => {
        const missing = {
            ...freeEverythingActiveFixture,
        } as Record<string, unknown>;
        delete missing.active;
        expect(() => FreeEverythingStatusContract.parse(missing)).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            FreeEverythingStatusContract.parse({
                ...freeEverythingActiveFixture,
                enabled: true,
            })
        ).toThrow();
    });

    it('contract catches a WRONG-typed field (string where boolean active)', () => {
        expect(() =>
            FreeEverythingStatusContract.parse({
                ...freeEverythingActiveFixture,
                active: 'yes',
            })
        ).toThrow();
    });
});
