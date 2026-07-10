import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { CountryFactsWireContract } from '../test/contracts/countryFacts.contract';
import {
    fullFactsWireFixture,
    minimalFactsWireFixture,
} from '../test/fixtures/countryFacts';
import { fetchCountryFacts } from './countryFactsApi';

const API_BASE = 'http://localhost:8000';
// Handlers match the path only; the client appends `?code=...`, which MSW
// matches regardless (a query in the handler URL triggers a redundancy warning).
const url = (_code?: string) => `${API_BASE}/country-facts`;

describe('countryFactsApi contract — GET /country-facts', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            CountryFactsWireContract.parse(fullFactsWireFixture)
        ).not.toThrow();
        expect(() =>
            CountryFactsWireContract.parse(minimalFactsWireFixture)
        ).not.toThrow();
    });

    it('reshapes a full payload into the camelCase result', async () => {
        let sentCode: string | null = null;
        server.use(
            http.get(url(), ({ request }) => {
                sentCode = new URL(request.url).searchParams.get('code');
                return HttpResponse.json(fullFactsWireFixture);
            })
        );
        const facts = await fetchCountryFacts('JP');
        expect(sentCode).toBe('JP');
        expect(facts).not.toBeNull();
        expect(facts).toMatchObject({
            countryCode: 'JP',
            emergency: { general: '110', police: '110', ambulance: '119' },
            power: { plugs: ['A', 'B'], voltage: 100, frequency: 50 },
            timezone: 'Asia/Tokyo',
            timezoneMulti: false,
            water: { status: 'safe', note: 'Tap water is safe to drink' },
            greatFor: ['food', 'culture'],
            source: 'curated',
        });
        // Nested reshapes that rename keys.
        expect(facts?.currencyTips).toEqual({
            cards: 'Widely accepted in cities',
            cash: 'Still handy for small shops',
            atm: '7-Eleven ATMs take foreign cards',
            applePay: 'Common via Suica',
            cardsRating: 4,
            cashRating: 3,
        });
        expect(facts?.festivals).toEqual([
            { name: 'Cherry Blossom', when: 'Late March–April' },
            { name: 'Obon', when: 'August' },
        ]);
    });

    it('applies null/empty defaults for a minimal payload', async () => {
        server.use(
            http.get(url('XY'), () =>
                HttpResponse.json(minimalFactsWireFixture)
            )
        );
        const facts = await fetchCountryFacts('XY');
        expect(facts).toEqual({
            countryCode: 'XY',
            emergency: { general: '112' },
            power: null,
            timezone: null,
            timezoneMulti: true,
            religion: null,
            tipping: null,
            water: null,
            wifi: null,
            greatFor: [],
            safetyTips: [],
            scams: [],
            health: null,
            accessibility: null,
            currencyTips: null,
            avgCosts: null,
            festivals: [],
            etiquette: [],
            source: 'curated',
        });
    });

    it('maps 204 (uncurated country) to null', async () => {
        server.use(
            http.get(
                url('ZZ'),
                () => new HttpResponse(null, { status: 204 })
            )
        );
        expect(await fetchCountryFacts('ZZ')).toBeNull();
    });

    it('throws the backend detail on a non-OK response', async () => {
        server.use(
            http.get(url('JP'), () =>
                HttpResponse.json({ detail: 'boom' }, { status: 500 })
            )
        );
        await expect(fetchCountryFacts('JP')).rejects.toThrow('boom');
    });

    it('throws a status-code message when the error body is not JSON', async () => {
        server.use(
            http.get(
                url('JP'),
                () =>
                    new HttpResponse('nope', {
                        status: 502,
                        headers: { 'content-type': 'text/plain' },
                    })
            )
        );
        await expect(fetchCountryFacts('JP')).rejects.toThrow(
            'Request failed (502)'
        );
    });

    it('falls back to water=caution for an unknown status, echoes source=ai, and defaults nested arrays', async () => {
        server.use(
            http.get(url('AI'), () =>
                HttpResponse.json({
                    country_code: 'AI',
                    // emergency omitted → defaults to {}
                    power: { voltage: 230, frequency: 50 }, // plugs omitted → []
                    timezone: 'Europe/Paris',
                    timezone_multi: false,
                    religion: { main: 'Secular', emoji: null, note: null }, // customs omitted → []
                    tipping: { summary: 'Optional' }, // categories omitted → {}
                    water: { status: 'mystery' }, // unknown → caution, note → null
                    wifi: { rating: 3, summary: 'OK' }, // mobile omitted → null
                    currency_tips: { cards: 'Common' }, // rest → null
                    avg_costs: { budget: '50' }, // rest → null
                    health: { vaccinations: 'Routine' }, // rest → null
                    accessibility: { wheelchair: 'Limited' }, // rest → null
                    source: 'ai',
                })
            )
        );
        const facts = await fetchCountryFacts('AI');
        expect(facts?.emergency).toEqual({});
        expect(facts?.power).toEqual({ plugs: [], voltage: 230, frequency: 50 });
        expect(facts?.religion).toEqual({
            main: 'Secular',
            emoji: null,
            note: null,
            customs: [],
        });
        expect(facts?.tipping).toEqual({ summary: 'Optional', categories: {} });
        expect(facts?.water).toEqual({ status: 'caution', note: null });
        expect(facts?.wifi).toEqual({ rating: 3, summary: 'OK', mobile: null });
        expect(facts?.currencyTips).toEqual({
            cards: 'Common',
            cash: null,
            atm: null,
            applePay: null,
            cardsRating: null,
            cashRating: null,
        });
        expect(facts?.avgCosts).toMatchObject({ budget: '50', luxury: null });
        expect(facts?.health).toEqual({
            vaccinations: 'Routine',
            mosquitoes: null,
            malaria: null,
        });
        expect(facts?.accessibility).toEqual({
            wheelchair: 'Limited',
            transit: null,
            sidewalks: null,
            signage: null,
        });
        expect(facts?.source).toBe('ai');
    });

    it('preserves an explicit water=unsafe verdict', async () => {
        server.use(
            http.get(url('WU'), () =>
                HttpResponse.json({
                    ...minimalFactsWireFixture,
                    country_code: 'WU',
                    water: { status: 'unsafe', note: 'Bottled only' },
                })
            )
        );
        const facts = await fetchCountryFacts('WU');
        expect(facts?.water).toEqual({
            status: 'unsafe',
            note: 'Bottled only',
        });
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = { ...fullFactsWireFixture } as Record<string, unknown>;
        delete missing.country_code;
        expect(() => CountryFactsWireContract.parse(missing)).toThrow();
        expect(() =>
            CountryFactsWireContract.parse({
                ...fullFactsWireFixture,
                mystery_field: true,
            })
        ).toThrow();
        expect(() =>
            CountryFactsWireContract.parse({
                ...fullFactsWireFixture,
                timezone_multi: 'no',
            })
        ).toThrow();
    });
});
