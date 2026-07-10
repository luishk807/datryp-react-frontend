import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    maintenanceActiveFixture,
    maintenanceOffFixture,
} from 'test/fixtures/maintenance';
import { MaintenanceStatusContract } from 'test/contracts/maintenance.contract';
import { fetchMaintenanceStatus, updateMaintenance } from './maintenanceApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const READ_URL = `${API_BASE}/maintenance`;
const WRITE_URL = `${API_BASE}/admin/settings/maintenance`;

describe('maintenanceApi contract', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            MaintenanceStatusContract.parse(maintenanceActiveFixture)
        ).not.toThrow();
        expect(() =>
            MaintenanceStatusContract.parse(maintenanceOffFixture)
        ).not.toThrow();
    });

    describe('fetchMaintenanceStatus (public GET /maintenance)', () => {
        it('returns the mapped status', async () => {
            server.use(
                http.get(READ_URL, () => HttpResponse.json(maintenanceActiveFixture))
            );
            const res = await fetchMaintenanceStatus();
            expect(res).toEqual({
                active: true,
                mode: 'banner',
                message:
                    'Scheduled upgrade in progress — some features may be slow.',
                until: '2026-07-11T02:00:00Z',
            });
        });

        it('carries NO Authorization header even when a token exists', async () => {
            setAuthToken('test-token');
            let authHeader: string | null = 'sentinel';
            server.use(
                http.get(READ_URL, ({ request }) => {
                    authHeader = request.headers.get('authorization');
                    return HttpResponse.json(maintenanceOffFixture);
                })
            );
            await fetchMaintenanceStatus();
            expect(authHeader).toBeNull();
        });

        it('throws on a non-OK response', async () => {
            server.use(
                http.get(READ_URL, () => new HttpResponse(null, { status: 500 }))
            );
            await expect(fetchMaintenanceStatus()).rejects.toThrow(
                /\/maintenance 500/
            );
        });
    });

    describe('updateMaintenance (POST /admin/settings/maintenance)', () => {
        beforeEach(() => setAuthToken('admin-token'));

        it('sends only { enabled } and the bearer token when no options given', async () => {
            let body: unknown;
            let authHeader: string | null = null;
            server.use(
                http.post(WRITE_URL, async ({ request }) => {
                    body = await request.json();
                    authHeader = request.headers.get('authorization');
                    return HttpResponse.json(maintenanceOffFixture);
                })
            );
            const res = await updateMaintenance({ enabled: false });
            expect(body).toEqual({ enabled: false });
            expect(authHeader).toBe('Bearer admin-token');
            expect(res.mode).toBe('full');
        });

        it('forwards mode/message/durationHours/untilIso (incl. null message)', async () => {
            let body: unknown;
            server.use(
                http.post(WRITE_URL, async ({ request }) => {
                    body = await request.json();
                    return HttpResponse.json(maintenanceActiveFixture);
                })
            );
            await updateMaintenance({
                enabled: true,
                mode: 'full',
                message: null,
                durationHours: 6,
                untilIso: '2026-07-12T00:00:00Z',
            });
            expect(body).toEqual({
                enabled: true,
                mode: 'full',
                message: null,
                duration_hours: 6,
                until_iso: '2026-07-12T00:00:00Z',
            });
        });

        it('throws with the backend detail on a non-OK response', async () => {
            server.use(
                http.post(WRITE_URL, () =>
                    HttpResponse.json({ detail: 'forbidden' }, { status: 403 })
                )
            );
            await expect(updateMaintenance({ enabled: true })).rejects.toThrow(
                '/admin/settings/maintenance 403 — forbidden'
            );
        });

        it('throws a status-only error when the error body is not JSON', async () => {
            server.use(
                http.post(WRITE_URL, () => new HttpResponse('x', { status: 500 }))
            );
            await expect(updateMaintenance({ enabled: true })).rejects.toThrow(
                /\/admin\/settings\/maintenance 500/
            );
        });
    });

    it('contract catches a MISSING required field (backend drift)', () => {
        const missing = {
            ...maintenanceActiveFixture,
        } as Record<string, unknown>;
        delete missing.mode;
        expect(() => MaintenanceStatusContract.parse(missing)).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            MaintenanceStatusContract.parse({
                ...maintenanceActiveFixture,
                enabled: true,
            })
        ).toThrow();
    });

    it('contract catches a BAD enum value for mode', () => {
        expect(() =>
            MaintenanceStatusContract.parse({
                ...maintenanceActiveFixture,
                mode: 'partial',
            })
        ).toThrow();
    });
});
