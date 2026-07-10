import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { act, waitFor } from '@testing-library/react';
import { server } from '../../test/msw/server';
import {
    renderHookWithProviders,
    makeTestQueryClient,
} from '../../test/renderWithProviders';
import {
    featureFlagsWireFixture,
    smsSettingWireFixture,
} from '../../test/fixtures/features';
import {
    featureKeys,
    useFeatureFlags,
    useSmsEnabled,
    useSmsSetting,
    useUpdateSmsSetting,
} from './useFeatures';

const BASE = 'http://localhost:8000';

let mockIsAdmin = true;
vi.mock('context/UserContext', () => ({
    useUser: () => ({ user: { id: 'u1' }, isAdmin: mockIsAdmin }),
}));

beforeEach(() => {
    mockIsAdmin = true;
});

describe('useFeatureFlags', () => {
    it('fetches + reshapes the public flags', async () => {
        server.use(
            http.get(`${BASE}/features`, () =>
                HttpResponse.json(featureFlagsWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useFeatureFlags());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({ smsEnabled: true });
    });

    it('surfaces an error when the backend fails', async () => {
        server.use(
            http.get(
                `${BASE}/features`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        const { result } = renderHookWithProviders(() => useFeatureFlags());
        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});

describe('useSmsEnabled', () => {
    it('resolves to the flag value once loaded', async () => {
        server.use(
            http.get(`${BASE}/features`, () =>
                HttpResponse.json(featureFlagsWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useSmsEnabled());
        await waitFor(() => expect(result.current).toBe(true));
    });
});

describe('useSmsSetting', () => {
    it('reads the admin SMS setting when admin', async () => {
        server.use(
            http.get(`${BASE}/admin/settings/sms`, () =>
                HttpResponse.json(smsSettingWireFixture)
            )
        );
        const { result } = renderHookWithProviders(() => useSmsSetting());
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data).toEqual({
            enabled: true,
            configured: true,
            effective: true,
        });
    });

    it('is idle for a non-admin', () => {
        mockIsAdmin = false;
        const { result } = renderHookWithProviders(() => useSmsSetting());
        expect(result.current.fetchStatus).toBe('idle');
    });
});

describe('useUpdateSmsSetting', () => {
    it('POSTs + writes both the admin setting and public flag caches', async () => {
        let body: unknown;
        server.use(
            http.post(`${BASE}/admin/settings/sms`, async ({ request }) => {
                body = await request.json();
                return HttpResponse.json(smsSettingWireFixture);
            })
        );
        const client = makeTestQueryClient();
        const { result } = renderHookWithProviders(
            () => useUpdateSmsSetting(),
            { client }
        );
        await act(async () => {
            await result.current.mutateAsync(true);
        });
        expect(body).toEqual({ enabled: true });
        // Both cache writes land a tick after mutateAsync resolves (v5) — poll
        // for both together so neither is read in a partial state.
        await waitFor(() => {
            expect(client.getQueryData(featureKeys.smsSetting)).toEqual({
                enabled: true,
                configured: true,
                effective: true,
            });
            expect(client.getQueryData(featureKeys.flags)).toEqual({
                smsEnabled: true,
            });
        });
    });
});
