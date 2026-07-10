import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import { activeLang } from 'i18n';
import {
    tripOptionsResponseWireFixture,
    aiTripBuilderResultWireFixture,
} from 'test/fixtures/aiTripBuilder';
import {
    TripOptionsResponseWireContract,
    AiTripBuilderResultWireContract,
} from 'test/contracts/aiTripBuilder.contract';
import { generateTripOptions, planTripWithAi } from './aiTripBuilderApi';
import { BucketListPaywallError } from './bucketListApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const OPTIONS_URL = `${API_BASE}/me/plan-trip-ai/options`;
const PLAN_URL = `${API_BASE}/me/plan-trip-ai`;

const minimalInput = { budgetUsd: 2000, interests: ['food', 'beaches'] };

// Contract tests for the AI Trip Builder boundary: drive both REAL clients
// through MSW so the bearer token, the camel→snake body mapping (incl. null
// defaults for omitted optionals), the option/result reshapes, the 402
// BucketListPaywallError branch, and the generic error branches are exercised.
describe('aiTripBuilderApi contract — POST /me/plan-trip-ai(/options)', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('wire fixtures satisfy the contracts', () => {
        expect(() =>
            TripOptionsResponseWireContract.parse(tripOptionsResponseWireFixture)
        ).not.toThrow();
        expect(() =>
            AiTripBuilderResultWireContract.parse(aiTripBuilderResultWireFixture)
        ).not.toThrow();
    });

    // ── generateTripOptions ──
    it('generateTripOptions reshapes options + defaults omitted body fields to null', async () => {
        let authHeader: string | null = null;
        let body: unknown;
        server.use(
            http.post(OPTIONS_URL, async ({ request }) => {
                authHeader = request.headers.get('authorization');
                body = await request.json();
                return HttpResponse.json(tripOptionsResponseWireFixture);
            })
        );
        const result = await generateTripOptions(minimalInput);
        expect(authHeader).toBe('Bearer test-token');
        expect(body).toEqual({
            budget_usd: 2000,
            interests: ['food', 'beaches'],
            duration_days: null,
            country_hint: null,
            party_size: null,
            traveler_styles: null,
            lang: activeLang(),
        });
        expect(result).toEqual([
            {
                countryName: 'Portugal',
                countryCode: 'PT',
                headline: 'Sun-soaked coast + soulful cities',
                whyThisFits:
                    'Great food scene and walkable towns on your budget.',
                estimatedCostUsd: 1800,
                durationDays: 7,
                highlights: [
                    'Lisbon miradouros',
                    'Douro Valley wine',
                    'Algarve beaches',
                ],
                imageUrl: 'https://images.example.com/portugal.jpg',
                photographerName: 'Rui Costa',
                photographerUrl: 'https://example.com/rui',
            },
            {
                countryName: 'Vietnam',
                countryCode: 'VN',
                headline: 'Street food and limestone bays',
                whyThisFits: 'Incredible value and rich culinary culture.',
                estimatedCostUsd: 1500,
                durationDays: 10,
                highlights: ['Hanoi Old Quarter', 'Ha Long Bay'],
                imageUrl: null,
                photographerName: null,
                photographerUrl: null,
            },
        ]);
    });

    it('generateTripOptions forwards provided optional fields', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(OPTIONS_URL, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(tripOptionsResponseWireFixture);
            })
        );
        await generateTripOptions({
            budgetUsd: 3000,
            interests: ['ski'],
            durationDays: 5,
            countryHint: 'Japan',
            partySize: 4,
            travelerStyles: ['luxury'],
        });
        expect(body).toMatchObject({
            budget_usd: 3000,
            duration_days: 5,
            country_hint: 'Japan',
            party_size: 4,
            traveler_styles: ['luxury'],
        });
    });

    it('generateTripOptions throws a default BucketListPaywallError on a bodyless 402', async () => {
        server.use(
            http.post(OPTIONS_URL, () => new HttpResponse(null, { status: 402 }))
        );
        let err: unknown;
        try {
            await generateTripOptions(minimalInput);
        } catch (e) {
            err = e;
        }
        expect(err).toBeInstanceOf(BucketListPaywallError);
        const pe = err as BucketListPaywallError;
        expect(pe.kind).toBe('ai_trip_builder_pro');
        expect(pe.message).toBe(
            'AI trip building is a Pro feature. Upgrade to unlock it.'
        );
    });

    it('generateTripOptions surfaces the structured 402 detail kind + message', async () => {
        server.use(
            http.post(OPTIONS_URL, () =>
                HttpResponse.json(
                    {
                        detail: {
                            kind: 'ai_trip_builder_pro',
                            message: 'Go Pro for AI plans',
                        },
                    },
                    { status: 402 }
                )
            )
        );
        await expect(generateTripOptions(minimalInput)).rejects.toThrow(
            'Go Pro for AI plans'
        );
    });

    it('generateTripOptions falls back to default kind + message when the 402 detail is empty', async () => {
        server.use(
            http.post(OPTIONS_URL, () =>
                HttpResponse.json({ detail: {} }, { status: 402 })
            )
        );
        let err: unknown;
        try {
            await generateTripOptions(minimalInput);
        } catch (e) {
            err = e;
        }
        expect(err).toBeInstanceOf(BucketListPaywallError);
        const pe = err as BucketListPaywallError;
        expect(pe.kind).toBe('ai_trip_builder_pro');
        expect(pe.message).toBe(
            'AI trip building is a Pro feature. Upgrade to unlock it.'
        );
    });

    it('generateTripOptions throws the string detail on a non-402 error', async () => {
        server.use(
            http.post(OPTIONS_URL, () =>
                HttpResponse.json({ detail: 'Bad request' }, { status: 400 })
            )
        );
        await expect(generateTripOptions(minimalInput)).rejects.toThrow(
            'Bad request'
        );
    });

    it('generateTripOptions falls back to a status message on a non-JSON error', async () => {
        server.use(
            http.post(
                OPTIONS_URL,
                () => new HttpResponse('boom', { status: 500 })
            )
        );
        await expect(generateTripOptions(minimalInput)).rejects.toThrow(
            'Trip options failed: 500'
        );
    });

    // ── planTripWithAi ──
    it('planTripWithAi reshapes the result + sends hero_image_url + bearer', async () => {
        let authHeader: string | null = null;
        let body: unknown;
        server.use(
            http.post(PLAN_URL, async ({ request }) => {
                authHeader = request.headers.get('authorization');
                body = await request.json();
                return HttpResponse.json(aiTripBuilderResultWireFixture);
            })
        );
        const result = await planTripWithAi({
            budgetUsd: 2500,
            interests: ['food'],
            heroImageUrl: 'https://images.example.com/hero.jpg',
        });
        expect(authHeader).toBe('Bearer test-token');
        expect(body).toEqual({
            budget_usd: 2500,
            interests: ['food'],
            duration_days: null,
            country_hint: null,
            hero_image_url: 'https://images.example.com/hero.jpg',
            party_size: null,
            traveler_styles: null,
            lang: activeLang(),
        });
        expect(result).toEqual({
            itineraryId: 'itin-42',
            tripType: 'single',
            tripName: '7 Days in Portugal',
            countryName: 'Portugal',
            durationDays: 7,
            rationale: 'Balances your food + coast interests within budget.',
        });
    });

    it('planTripWithAi defaults hero_image_url to null when omitted', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(PLAN_URL, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(aiTripBuilderResultWireFixture);
            })
        );
        await planTripWithAi(minimalInput);
        expect(body.hero_image_url).toBeNull();
    });

    it('planTripWithAi throws a default BucketListPaywallError on a bodyless 402', async () => {
        server.use(
            http.post(PLAN_URL, () => new HttpResponse(null, { status: 402 }))
        );
        let err: unknown;
        try {
            await planTripWithAi(minimalInput);
        } catch (e) {
            err = e;
        }
        expect(err).toBeInstanceOf(BucketListPaywallError);
        expect((err as BucketListPaywallError).kind).toBe('ai_trip_builder_pro');
    });

    it('planTripWithAi surfaces the structured 402 detail message', async () => {
        server.use(
            http.post(PLAN_URL, () =>
                HttpResponse.json(
                    {
                        detail: {
                            kind: 'ai_trip_builder_pro',
                            message: 'Upgrade!',
                        },
                    },
                    { status: 402 }
                )
            )
        );
        await expect(planTripWithAi(minimalInput)).rejects.toThrow('Upgrade!');
    });

    it('planTripWithAi falls back to default kind + message when the 402 detail is empty', async () => {
        server.use(
            http.post(PLAN_URL, () =>
                HttpResponse.json({ detail: {} }, { status: 402 })
            )
        );
        let err: unknown;
        try {
            await planTripWithAi(minimalInput);
        } catch (e) {
            err = e;
        }
        expect(err).toBeInstanceOf(BucketListPaywallError);
        const pe = err as BucketListPaywallError;
        expect(pe.kind).toBe('ai_trip_builder_pro');
        expect(pe.message).toBe(
            'AI trip building is a Pro feature. Upgrade to unlock it.'
        );
    });

    it('planTripWithAi throws the string detail on a non-402 error', async () => {
        server.use(
            http.post(PLAN_URL, () =>
                HttpResponse.json({ detail: 'Nope' }, { status: 409 })
            )
        );
        await expect(planTripWithAi(minimalInput)).rejects.toThrow('Nope');
    });

    it('planTripWithAi falls back to a status message on a non-JSON error', async () => {
        server.use(
            http.post(PLAN_URL, () => new HttpResponse('down', { status: 502 }))
        );
        await expect(planTripWithAi(minimalInput)).rejects.toThrow(
            'Trip planning failed: 502'
        );
    });

    it('contracts catch drift (missing / extra / wrong-typed / bad enum)', () => {
        expect(() => TripOptionsResponseWireContract.parse({})).toThrow();
        expect(() =>
            AiTripBuilderResultWireContract.parse({
                ...aiTripBuilderResultWireFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            AiTripBuilderResultWireContract.parse({
                ...aiTripBuilderResultWireFixture,
                trip_type: 'group',
            })
        ).toThrow();
        expect(() =>
            TripOptionsResponseWireContract.parse({
                options: [
                    {
                        ...tripOptionsResponseWireFixture.options[0],
                        estimated_cost_usd: '1800',
                    },
                ],
            })
        ).toThrow();
    });
});
