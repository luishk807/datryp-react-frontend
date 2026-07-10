import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    FeatureFlagsWireContract,
    SmsSettingWireContract,
} from '../test/contracts/features.contract';
import {
    featureFlagsWireFixture,
    smsSettingWireFixture,
} from '../test/fixtures/features';
import {
    fetchFeatureFlags,
    fetchSmsSetting,
    updateSmsSetting,
} from './featuresApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';

describe('featuresApi contract — GET /features', () => {
    it('fixture satisfies the wire contract', () => {
        expect(() =>
            FeatureFlagsWireContract.parse(featureFlagsWireFixture)
        ).not.toThrow();
    });

    it('fetchFeatureFlags maps sms_enabled → smsEnabled', async () => {
        server.use(
            http.get(`${API_BASE}/features`, () =>
                HttpResponse.json(featureFlagsWireFixture)
            )
        );
        expect(await fetchFeatureFlags()).toEqual({ smsEnabled: true });
    });

    it('throws on a non-OK response', async () => {
        server.use(
            http.get(
                `${API_BASE}/features`,
                () => new HttpResponse(null, { status: 503 })
            )
        );
        await expect(fetchFeatureFlags()).rejects.toThrow('/features 503');
    });

    it('contract catches a MISSING field', () => {
        expect(() => FeatureFlagsWireContract.parse({})).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict)', () => {
        expect(() =>
            FeatureFlagsWireContract.parse({
                ...featureFlagsWireFixture,
                push_enabled: true,
            })
        ).toThrow();
    });

    it('contract catches a WRONG-typed field', () => {
        expect(() =>
            FeatureFlagsWireContract.parse({ sms_enabled: 'yes' })
        ).toThrow();
    });
});

describe('featuresApi contract — GET /admin/settings/sms', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixture satisfies the wire contract', () => {
        expect(() =>
            SmsSettingWireContract.parse(smsSettingWireFixture)
        ).not.toThrow();
    });

    it('fetchSmsSetting returns the full setting and sends the bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(`${API_BASE}/admin/settings/sms`, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(smsSettingWireFixture);
            })
        );
        const setting = await fetchSmsSetting();
        expect(setting).toEqual({
            enabled: true,
            configured: true,
            effective: true,
        });
        expect(authHeader).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.get(`${API_BASE}/admin/settings/sms`, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(smsSettingWireFixture);
            })
        );
        await fetchSmsSetting();
        expect(authHeader).toBeNull();
    });

    it('throws on a non-OK response', async () => {
        server.use(
            http.get(
                `${API_BASE}/admin/settings/sms`,
                () => new HttpResponse(null, { status: 403 })
            )
        );
        await expect(fetchSmsSetting()).rejects.toThrow(
            '/admin/settings/sms 403'
        );
    });
});

describe('featuresApi contract — POST /admin/settings/sms', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('updateSmsSetting sends { enabled } and returns the mapped setting', async () => {
        let body: unknown;
        let contentType: string | null = null;
        server.use(
            http.post(
                `${API_BASE}/admin/settings/sms`,
                async ({ request }) => {
                    body = await request.json();
                    contentType = request.headers.get('content-type');
                    return HttpResponse.json({
                        enabled: false,
                        configured: true,
                        effective: false,
                    });
                }
            )
        );
        const res = await updateSmsSetting(false);
        expect(body).toEqual({ enabled: false });
        expect(contentType).toContain('application/json');
        expect(res).toEqual({
            enabled: false,
            configured: true,
            effective: false,
        });
    });

    it('surfaces the backend detail message on error', async () => {
        server.use(
            http.post(`${API_BASE}/admin/settings/sms`, () =>
                HttpResponse.json(
                    { detail: 'Twilio not configured' },
                    { status: 400 }
                )
            )
        );
        await expect(updateSmsSetting(true)).rejects.toThrow(
            '/admin/settings/sms 400 — Twilio not configured'
        );
    });

    it('falls back to the status code when the error body is not JSON', async () => {
        server.use(
            http.post(
                `${API_BASE}/admin/settings/sms`,
                () =>
                    new HttpResponse('boom', {
                        status: 500,
                        headers: { 'content-type': 'text/plain' },
                    })
            )
        );
        await expect(updateSmsSetting(true)).rejects.toThrow(
            '/admin/settings/sms 500'
        );
    });
});
