import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from 'test/msw/server';
import {
    essentialAppsFixture,
    essentialAppsAiFixture,
    essentialAppsLegacyFixture,
} from 'test/fixtures/essentialApps';
import {
    EssentialAppContract,
    EssentialAppsContract,
} from 'test/contracts/essentialApps.contract';
import { fetchEssentialApps } from './essentialAppsApi';

const API_BASE = 'http://localhost:8000';
const ENDPOINT = `${API_BASE}/essential-apps`;

describe('essentialAppsApi contract — GET /essential-apps', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() =>
            EssentialAppsContract.parse(essentialAppsFixture)
        ).not.toThrow();
        expect(() =>
            EssentialAppsContract.parse(essentialAppsAiFixture)
        ).not.toThrow();
        expect(() =>
            EssentialAppsContract.parse(essentialAppsLegacyFixture)
        ).not.toThrow();
    });

    it('reshapes payload + normalizes app status (essential/caution/else→null)', async () => {
        server.use(http.get(ENDPOINT, () => HttpResponse.json(essentialAppsFixture)));
        const res = await fetchEssentialApps('JP');
        expect(res).not.toBeNull();
        expect(res!.countryCode).toBe('JP');
        expect(res!.source).toBe('curated');
        expect(res!.intro).toBe(
            'Getting around Japan is easy with a couple of key apps.'
        );
        const apps = res!.categories[0].apps;
        expect(apps.map((a) => a.status)).toEqual([
            'essential',
            'caution',
            null, // status was null
            null, // unrecognized status normalized to null
        ]);
        expect(res!.categories[0].key).toBe('ride_hailing');
    });

    it('maps source "ai" through and defaults a missing intro to null', async () => {
        server.use(http.get(ENDPOINT, () => HttpResponse.json(essentialAppsAiFixture)));
        const res = await fetchEssentialApps('FR');
        expect(res!.source).toBe('ai');
        expect(res!.intro).toBeNull();
    });

    it('defaults source to "curated" when the field is absent (legacy row)', async () => {
        server.use(
            http.get(ENDPOINT, () => HttpResponse.json(essentialAppsLegacyFixture))
        );
        const res = await fetchEssentialApps('IT');
        expect(res!.source).toBe('curated');
        expect(res!.intro).toBeNull();
        expect(res!.categories).toEqual([]);
    });

    it('sends the country code as an encoded query param', async () => {
        let receivedCode: string | null = null;
        server.use(
            http.get(ENDPOINT, ({ request }) => {
                receivedCode = new URL(request.url).searchParams.get('code');
                return HttpResponse.json(essentialAppsLegacyFixture);
            })
        );
        await fetchEssentialApps('US & CA');
        expect(receivedCode).toBe('US & CA');
    });

    it('returns null on a 204 (country not curated)', async () => {
        server.use(http.get(ENDPOINT, () => new HttpResponse(null, { status: 204 })));
        expect(await fetchEssentialApps('ZZ')).toBeNull();
    });

    it('throws the backend detail on a non-OK JSON error', async () => {
        server.use(
            http.get(ENDPOINT, () =>
                HttpResponse.json({ detail: 'bad code' }, { status: 400 })
            )
        );
        await expect(fetchEssentialApps('??')).rejects.toThrow('bad code');
    });

    it('throws a status-code message when the error body is not JSON', async () => {
        server.use(
            http.get(ENDPOINT, () => new HttpResponse('boom', { status: 500 }))
        );
        await expect(fetchEssentialApps('JP')).rejects.toThrow(
            'Request failed (500)'
        );
    });

    it('contract catches a MISSING required field (backend drift)', () => {
        const missing = { ...essentialAppsFixture } as Record<string, unknown>;
        delete missing.country_code;
        expect(() => EssentialAppsContract.parse(missing)).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            EssentialAppContract.parse({
                name: 'X',
                note: null,
                status: null,
                surprise: true,
            })
        ).toThrow();
    });

    it('contract catches a WRONG-typed field (number where string name)', () => {
        expect(() =>
            EssentialAppContract.parse({ name: 42, note: null, status: null })
        ).toThrow();
    });
});
