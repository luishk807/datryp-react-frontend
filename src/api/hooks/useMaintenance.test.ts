import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    maintenanceActiveFixture,
    maintenanceOffFixture,
} from '../../test/fixtures/maintenance';
import {
    maintenanceKeys,
    useMaintenanceStatus,
    useMaintenanceSetting,
    useUpdateMaintenance,
} from './useMaintenance';

const BASE = 'http://localhost:8000';

let mockIsAdmin = true;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: { id: 'u1' }, isAdmin: mockIsAdmin }),
}));

beforeEach(() => {
    mockIsAdmin = true;
});

describe('useMaintenanceStatus', () => {
    it('fetches + reshapes the public status', async () => {
        server.use(
            http.get(`${BASE}/maintenance`, () =>
                HttpResponse.json(maintenanceActiveFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useMaintenanceStatus()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            active: true,
            mode: 'banner',
            message: maintenanceActiveFixture.message,
            until: maintenanceActiveFixture.until,
        });
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(
                `${BASE}/maintenance`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() =>
            useMaintenanceStatus()
        );
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useMaintenanceSetting', () => {
    it('reads the status when admin', async () => {
        server.use(
            http.get(`${BASE}/maintenance`, () =>
                HttpResponse.json(maintenanceOffFixture)
            )
        );
        const { result } = renderHookWithProviders(() =>
            useMaintenanceSetting()
        );
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            active: false,
            mode: 'full',
            message: null,
            until: null,
        });
    });

    it('is idle for a non-admin', () => {
        mockIsAdmin = false;
        const { result } = renderHookWithProviders(() =>
            useMaintenanceSetting()
        );
        expect(result.current.fetchStatus).toBe('idle');
    });
});

describe('useUpdateMaintenance', () => {
    it('POSTs the payload + writes the shared status cache', async () => {
        let body: unknown;
        server.use(
            http.post(
                `${BASE}/admin/settings/maintenance`,
                async ({ request }) => {
                    body = await request.json();
                    return HttpResponse.json(maintenanceActiveFixture);
                }
            )
        );
        const client = makeTestQueryClient();
        const { result } = renderHookWithProviders(
            () => useUpdateMaintenance(),
            { client }
        );
        await act(async () => {
            await result.current.mutateAsync({
                enabled: true,
                mode: 'banner',
                message: 'Scheduled upgrade in progress — some features may be slow.',
                durationHours: 6,
            });
        });
        expect(body).toEqual({
            enabled: true,
            mode: 'banner',
            message: 'Scheduled upgrade in progress — some features may be slow.',
            duration_hours: 6,
        });
        // onSuccess cache write lands a tick after mutateAsync resolves (v5).
        await waitFor(() =>
            expect(client.getQueryData(maintenanceKeys.status)).toEqual({
                active: true,
                mode: 'banner',
                message: maintenanceActiveFixture.message,
                until: maintenanceActiveFixture.until,
            })
        );
    });
});
