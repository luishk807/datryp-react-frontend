import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import { GeoLanguageContract } from '../test/contracts/geoLanguage.contract';
import {
    geoLanguageEsFixture,
    geoLanguageEnFixture,
    geoLanguageNullFixture,
} from '../test/fixtures/geoLanguage';
import { fetchSuggestedLanguage, fetchGeoCountry } from './geoLanguageApi';

const API_BASE = 'http://localhost:8000';
const URL = `${API_BASE}/geo/language`;

// Contract tests for the fail-soft GeoIP boundary. Both exported helpers hit
// the same `/geo/language` endpoint and derive a primitive; every failure mode
// must resolve (never reject) so the i18n bootstrap keeps its default.
describe('geoLanguageApi contract — GET /geo/language', () => {
    it('fixtures satisfy the wire contract', () => {
        expect(() => GeoLanguageContract.parse(geoLanguageEsFixture)).not.toThrow();
        expect(() => GeoLanguageContract.parse(geoLanguageEnFixture)).not.toThrow();
        expect(() =>
            GeoLanguageContract.parse(geoLanguageNullFixture)
        ).not.toThrow();
    });

    it('contract catches a MISSING required field (backend drift)', () => {
        const missing = { ...geoLanguageEsFixture } as Record<string, unknown>;
        delete missing.lang;
        expect(() => GeoLanguageContract.parse(missing)).toThrow();
    });

    it('contract catches an UNEXPECTED extra field (strict shape)', () => {
        expect(() =>
            GeoLanguageContract.parse({ ...geoLanguageEsFixture, region: 'x' })
        ).toThrow();
    });

    it('contract catches a WRONG-typed field (number where string|null country)', () => {
        expect(() =>
            GeoLanguageContract.parse({ ...geoLanguageEsFixture, country: 42 })
        ).toThrow();
    });
});

describe('fetchSuggestedLanguage', () => {
    it('returns "es" when the backend hints Spanish', async () => {
        server.use(
            http.get(URL, () => HttpResponse.json(geoLanguageEsFixture))
        );
        expect(await fetchSuggestedLanguage()).toBe('es');
    });

    it('returns "en" when the backend hints English', async () => {
        server.use(
            http.get(URL, () => HttpResponse.json(geoLanguageEnFixture))
        );
        expect(await fetchSuggestedLanguage()).toBe('en');
    });

    it('returns null when lang is null', async () => {
        server.use(
            http.get(URL, () => HttpResponse.json(geoLanguageNullFixture))
        );
        expect(await fetchSuggestedLanguage()).toBeNull();
    });

    it('returns null for an unrecognized lang (fn tolerates non-en/es)', async () => {
        server.use(
            http.get(URL, () =>
                HttpResponse.json({ lang: 'fr', country: 'FR' })
            )
        );
        expect(await fetchSuggestedLanguage()).toBeNull();
    });

    it('returns null on a non-OK response', async () => {
        server.use(
            http.get(URL, () => new HttpResponse(null, { status: 500 }))
        );
        expect(await fetchSuggestedLanguage()).toBeNull();
    });

    it('returns null on a network error (fail-soft catch)', async () => {
        server.use(http.get(URL, () => HttpResponse.error()));
        expect(await fetchSuggestedLanguage()).toBeNull();
    });

    it('forwards the AbortSignal to fetch', async () => {
        const controller = new AbortController();
        controller.abort();
        // Aborted signal makes fetch reject; the fail-soft catch maps to null.
        expect(await fetchSuggestedLanguage(controller.signal)).toBeNull();
    });
});

describe('fetchGeoCountry', () => {
    it('returns the country code upper-cased', async () => {
        server.use(
            http.get(URL, () => HttpResponse.json(geoLanguageEsFixture))
        );
        expect(await fetchGeoCountry()).toBe('MX');
    });

    it('returns null when country is null', async () => {
        server.use(
            http.get(URL, () => HttpResponse.json(geoLanguageNullFixture))
        );
        expect(await fetchGeoCountry()).toBeNull();
    });

    it('returns null on a non-OK response', async () => {
        server.use(
            http.get(URL, () => new HttpResponse(null, { status: 404 }))
        );
        expect(await fetchGeoCountry()).toBeNull();
    });

    it('returns null on a network error (fail-soft catch)', async () => {
        server.use(http.get(URL, () => HttpResponse.error()));
        expect(await fetchGeoCountry()).toBeNull();
    });
});
