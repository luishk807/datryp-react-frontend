import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    activitySuggestWireFixture,
    activitySuggestNoResultFixture,
} from 'test/fixtures/activitySuggest';
import { SuggestFieldsResponseWireContract } from 'test/contracts/activitySuggest.contract';
import { suggestActivityFields } from './activitySuggestApi';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/activities/suggest-fields`;

// Contract tests for the fail-soft LLM field-guessing boundary: no-suggestion /
// non-OK / network error all resolve to null (never reject) so the Add-Activity
// form keeps whatever the user (or a prior lookup) already filled.
describe('activitySuggestApi contract — POST /activities/suggest-fields', () => {
    it('wire fixtures satisfy the contract', () => {
        expect(() =>
            SuggestFieldsResponseWireContract.parse(activitySuggestWireFixture)
        ).not.toThrow();
        expect(() =>
            SuggestFieldsResponseWireContract.parse(
                activitySuggestNoResultFixture
            )
        ).not.toThrow();
    });

    it('reshapes snake_case → camelCase and maps the request body', async () => {
        let body: unknown;
        let method: string | undefined;
        let contentType: string | null = null;
        server.use(
            http.post(ENDPOINT, async ({ request }) => {
                method = request.method;
                contentType = request.headers.get('content-type');
                body = await request.json();
                return HttpResponse.json(activitySuggestWireFixture);
            })
        );
        const result = await suggestActivityFields({
            kind: 'PLACE',
            name: 'buckingham palace',
            location: 'Westminster',
            city: 'London',
            country: 'United Kingdom',
            departLocation: 'LHR',
            arrivalLocation: 'CDG',
            provider: 'BA',
            date: '2026-09-01',
        });
        expect(method).toBe('POST');
        expect(contentType).toContain('application/json');
        expect(body).toEqual({
            kind: 'PLACE',
            name: 'buckingham palace',
            location: 'Westminster',
            city: 'London',
            country: 'United Kingdom',
            depart_location: 'LHR',
            arrival_location: 'CDG',
            provider: 'BA',
            date: '2026-09-01',
        });
        expect(result).toEqual({
            name: 'Buckingham Palace',
            location: 'Westminster',
            city: 'London',
            country: 'United Kingdom',
            startTime: '09:30',
            endTime: '11:30',
            checkInTime: null,
            checkOutTime: null,
            departTime: null,
            arrivalTime: null,
            cost: '30',
            currency: 'GBP',
        });
    });

    it('omits blank / undefined optional args from the request body', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.post(ENDPOINT, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(activitySuggestNoResultFixture);
            })
        );
        await suggestActivityFields({ kind: 'FLIGHT' });
        expect(body).toEqual({ kind: 'FLIGHT' });
    });

    it('defaults every missing field to null when the model returns a sparse result', async () => {
        server.use(
            http.post(ENDPOINT, () =>
                HttpResponse.json({ result: { name: 'Louvre' } })
            )
        );
        expect(await suggestActivityFields({ kind: 'PLACE' })).toEqual({
            name: 'Louvre',
            location: null,
            city: null,
            country: null,
            startTime: null,
            endTime: null,
            checkInTime: null,
            checkOutTime: null,
            departTime: null,
            arrivalTime: null,
            cost: null,
            currency: null,
        });
    });

    it('returns null when the backend has no suggestion (result: null)', async () => {
        server.use(
            http.post(ENDPOINT, () =>
                HttpResponse.json(activitySuggestNoResultFixture)
            )
        );
        expect(await suggestActivityFields({ kind: 'PLACE' })).toBeNull();
    });

    it('returns null (not an error) on a non-OK backend response', async () => {
        server.use(
            http.post(ENDPOINT, () => new HttpResponse(null, { status: 503 }))
        );
        expect(await suggestActivityFields({ kind: 'PLACE' })).toBeNull();
    });

    it('returns null on a network error (silent fail)', async () => {
        server.use(http.post(ENDPOINT, () => HttpResponse.error()));
        expect(await suggestActivityFields({ kind: 'PLACE' })).toBeNull();
    });

    it('contract catches drift (missing envelope / extra field / wrong-typed)', () => {
        expect(() => SuggestFieldsResponseWireContract.parse({})).toThrow();
        expect(() =>
            SuggestFieldsResponseWireContract.parse({
                result: {
                    ...activitySuggestWireFixture.result,
                    surprise: true,
                },
            })
        ).toThrow();
        expect(() =>
            SuggestFieldsResponseWireContract.parse({
                result: { ...activitySuggestWireFixture.result, cost: 30 },
            })
        ).toThrow();
    });
});
