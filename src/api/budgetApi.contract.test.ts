import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { BudgetSuggestWireContract } from '../test/contracts/budget.contract';
import {
    budgetRequestFixture,
    budgetResponseFixture,
    budgetNullResponseFixture,
} from '../test/fixtures/budget';
import { suggestBudget } from './budgetApi';
import { setAuthToken } from './authStorage';

const API_BASE = 'http://localhost:8000';
const URL = `${API_BASE}/budgets/suggest`;

describe('budgetApi contract — POST /budgets/suggest', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            BudgetSuggestWireContract.parse(budgetResponseFixture)
        ).not.toThrow();
        expect(() =>
            BudgetSuggestWireContract.parse(budgetNullResponseFixture)
        ).not.toThrow();
    });

    it('maps the wire result → camelCase and sends the bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.post(URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(budgetResponseFixture);
            })
        );
        const res = await suggestBudget(budgetRequestFixture);
        expect(res).toEqual({
            suggestedTotal: 2500,
            currency: 'USD',
            daily: 250,
            note: 'Mid-range week in Tokyo including flights.',
        });
        expect(authHeader).toBe('Bearer test-token');
    });

    it('reshapes the request body camelCase → snake_case (+ lang)', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(URL, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(budgetResponseFixture);
            })
        );
        await suggestBudget(budgetRequestFixture);
        expect(body).toEqual({
            country_code: 'JP',
            city: 'Tokyo',
            days: 7,
            travel_style: 'mid-range',
            start_date: '2026-09-01',
            home_country_code: 'US',
            home_city: 'New York',
            lang: expect.any(String),
        });
    });

    it('defaults optional request fields to null when omitted', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(URL, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(budgetNullResponseFixture);
            })
        );
        await suggestBudget({ countryCode: 'FR', days: 3 });
        expect(body).toMatchObject({
            country_code: 'FR',
            city: null,
            days: 3,
            travel_style: null,
            start_date: null,
            home_country_code: null,
            home_city: null,
        });
    });

    it('omits the Authorization header when no token is stored', async () => {
        setAuthToken(null);
        let authHeader: string | null = 'unset';
        server.use(
            http.post(URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(budgetNullResponseFixture);
            })
        );
        await suggestBudget({ countryCode: 'FR', days: 2 });
        expect(authHeader).toBeNull();
    });

    it('returns null when the model could not estimate (result: null)', async () => {
        server.use(
            http.post(URL, () => HttpResponse.json(budgetNullResponseFixture))
        );
        expect(await suggestBudget(budgetRequestFixture)).toBeNull();
    });

    it('throws on a non-OK response', async () => {
        server.use(
            http.post(
                URL,
                () =>
                    new HttpResponse(null, {
                        status: 502,
                        statusText: 'Bad Gateway',
                    })
            )
        );
        await expect(suggestBudget(budgetRequestFixture)).rejects.toThrow(
            '/budgets/suggest 502'
        );
    });

    it('contract catches drift (missing envelope / extra / wrong-typed)', () => {
        expect(() => BudgetSuggestWireContract.parse({})).toThrow();
        expect(() =>
            BudgetSuggestWireContract.parse({
                ...budgetResponseFixture,
                extra: 1,
            })
        ).toThrow();
        expect(() =>
            BudgetSuggestWireContract.parse({
                result: {
                    suggested_total: 'lots',
                    currency: 'USD',
                    daily: 250,
                    note: null,
                },
            })
        ).toThrow();
    });
});
