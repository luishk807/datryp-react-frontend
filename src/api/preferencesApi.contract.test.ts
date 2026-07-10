import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    PreferencesWireContract,
    InterestsCatalogWireContract,
    TravelerStylesCatalogWireContract,
    GendersCatalogWireContract,
} from '../test/contracts/preferences.contract';
import {
    preferencesWireFixture,
    interestsCatalogWireFixture,
    travelerStylesCatalogWireFixture,
    gendersCatalogWireFixture,
} from '../test/fixtures/preferences';
import {
    fetchMyPreferences,
    updateMyPreferences,
    fetchInterestsCatalog,
    fetchTravelerStylesCatalog,
    fetchGendersCatalog,
} from './preferencesApi';
import { setAuthToken } from './authStorage';
import type { PreferencesUpdate } from 'types';

const API_BASE = 'http://localhost:8000';
const PREFS_URL = `${API_BASE}/me/preferences`;

describe('preferencesApi contract — GET /me/preferences', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('fixture satisfies the wire contract', () => {
        expect(() =>
            PreferencesWireContract.parse(preferencesWireFixture)
        ).not.toThrow();
    });

    it('reshapes snake_case → camelCase and sends the bearer token', async () => {
        let authHeader: string | null = null;
        server.use(
            http.get(PREFS_URL, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(preferencesWireFixture);
            })
        );
        const prefs = await fetchMyPreferences();
        expect(authHeader).toBe('Bearer test-token');
        expect(prefs).toEqual({
            phone: '+15551234567',
            birthYear: 1990,
            countryOfBirthCode: 'US',
            passportCountryCode: 'US',
            genderId: 'gender-uuid-1',
            interests: ['food', 'hiking'],
            travelerStyles: ['budget'],
            dreamDestinations: ['Japan', 'Peru'],
            onboardingCompletedAt: '2026-01-01T00:00:00Z',
            homeCity: 'Panama City',
            homeCountry: 'Panama',
            homeCountryCode: 'PA',
            homeLatitude: 8.98,
            homeLongitude: -79.52,
            travelCompanions: ['partner'],
            kidsAgeBuckets: ['5-8'],
            notifyEmail: true,
            notifySms: false,
            shareVisitedPlaces: true,
        });
    });

    it('defaults null arrays / notify flags via the reshaper fallbacks', async () => {
        // A sparse payload (older backend) exercises the `?? []` / `?? true`
        // / `?? false` fallback branches in toPreferences.
        server.use(
            http.get(PREFS_URL, () =>
                HttpResponse.json({
                    phone: null,
                    birth_year: null,
                    country_of_birth_code: null,
                    passport_country_code: null,
                    gender_id: null,
                    interests: null,
                    traveler_styles: null,
                    dream_destinations: null,
                    onboarding_completed_at: null,
                    home_city: null,
                    home_country: null,
                    home_country_code: null,
                    home_latitude: null,
                    home_longitude: null,
                    travel_companions: null,
                    kids_age_buckets: null,
                    notify_email: null,
                    notify_sms: null,
                    share_visited_places: null,
                })
            )
        );
        const prefs = await fetchMyPreferences();
        expect(prefs.interests).toEqual([]);
        expect(prefs.travelerStyles).toEqual([]);
        expect(prefs.dreamDestinations).toEqual([]);
        expect(prefs.travelCompanions).toEqual([]);
        expect(prefs.kidsAgeBuckets).toEqual([]);
        expect(prefs.notifyEmail).toBe(true);
        expect(prefs.notifySms).toBe(false);
        expect(prefs.shareVisitedPlaces).toBe(false);
    });

    it('throws with the backend detail on error', async () => {
        server.use(
            http.get(PREFS_URL, () =>
                HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
            )
        );
        await expect(fetchMyPreferences()).rejects.toThrow(
            '/me/preferences 401'
        );
        await expect(fetchMyPreferences()).rejects.toThrow('Not authenticated');
    });

    it('throws with status only when the error body is not JSON', async () => {
        server.use(
            http.get(
                PREFS_URL,
                () =>
                    new HttpResponse('oops', {
                        status: 500,
                        headers: { 'content-type': 'text/plain' },
                    })
            )
        );
        await expect(fetchMyPreferences()).rejects.toThrow(
            '/me/preferences 500'
        );
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = { ...preferencesWireFixture } as Record<
            string,
            unknown
        >;
        delete missing.interests;
        expect(() => PreferencesWireContract.parse(missing)).toThrow();
        expect(() =>
            PreferencesWireContract.parse({
                ...preferencesWireFixture,
                nickname: 'x',
            })
        ).toThrow();
        expect(() =>
            PreferencesWireContract.parse({
                ...preferencesWireFixture,
                notify_email: 'yes',
            })
        ).toThrow();
    });
});

describe('preferencesApi contract — PATCH /me/preferences', () => {
    beforeEach(() => setAuthToken('test-token'));

    it('maps every provided field to its snake_case wire key', async () => {
        let body: Record<string, unknown> = {};
        server.use(
            http.patch(PREFS_URL, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(preferencesWireFixture);
            })
        );
        const update: PreferencesUpdate = {
            phone: '+15550000000',
            birthYear: 1985,
            countryOfBirthCode: 'CA',
            passportCountryCode: 'CA',
            genderId: 'g-2',
            interests: ['food'],
            travelerStyles: ['luxury'],
            dreamDestinations: ['Peru'],
            markComplete: true,
            homeCity: null,
            homeCountry: null,
            homeCountryCode: null,
            homeLatitude: null,
            homeLongitude: null,
            travelCompanions: ['partner'],
            kidsAgeBuckets: ['0-4'],
            notifyEmail: false,
            notifySms: true,
            shareVisitedPlaces: false,
        };
        await updateMyPreferences(update);
        expect(body).toEqual({
            phone: '+15550000000',
            birth_year: 1985,
            country_of_birth_code: 'CA',
            passport_country_code: 'CA',
            gender_id: 'g-2',
            interests: ['food'],
            traveler_styles: ['luxury'],
            dream_destinations: ['Peru'],
            mark_complete: true,
            home_city: null,
            home_country: null,
            home_country_code: null,
            home_latitude: null,
            home_longitude: null,
            travel_companions: ['partner'],
            kids_age_buckets: ['0-4'],
            notify_email: false,
            notify_sms: true,
            share_visited_places: false,
        });
    });

    it('omits undefined fields (empty update → empty body)', async () => {
        let body: Record<string, unknown> = { seeded: true };
        server.use(
            http.patch(PREFS_URL, async ({ request }) => {
                body = (await request.json()) as Record<string, unknown>;
                return HttpResponse.json(preferencesWireFixture);
            })
        );
        const result = await updateMyPreferences({});
        expect(body).toEqual({});
        // Response is still reshaped through toPreferences.
        expect(result.homeCity).toBe('Panama City');
    });

    it('throws with the "patch preferences" label on error', async () => {
        server.use(
            http.patch(PREFS_URL, () =>
                HttpResponse.json({ detail: 'bad value' }, { status: 422 })
            )
        );
        await expect(updateMyPreferences({ phone: 'x' })).rejects.toThrow(
            'patch preferences 422'
        );
    });
});

describe('preferencesApi contract — catalogs', () => {
    it('fixtures satisfy the catalog contracts', () => {
        expect(() =>
            InterestsCatalogWireContract.parse(interestsCatalogWireFixture)
        ).not.toThrow();
        expect(() =>
            TravelerStylesCatalogWireContract.parse(
                travelerStylesCatalogWireFixture
            )
        ).not.toThrow();
        expect(() =>
            GendersCatalogWireContract.parse(gendersCatalogWireFixture)
        ).not.toThrow();
    });

    it('fetchInterestsCatalog returns the interests array', async () => {
        server.use(
            http.get(`${API_BASE}/me/interests-catalog`, () =>
                HttpResponse.json(interestsCatalogWireFixture)
            )
        );
        const catalog = await fetchInterestsCatalog();
        expect(catalog).toEqual(interestsCatalogWireFixture.interests);
    });

    it('fetchInterestsCatalog throws on error', async () => {
        server.use(
            http.get(
                `${API_BASE}/me/interests-catalog`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        await expect(fetchInterestsCatalog()).rejects.toThrow(
            '/me/interests-catalog 500'
        );
    });

    it('fetchTravelerStylesCatalog returns the traveler_styles array', async () => {
        server.use(
            http.get(`${API_BASE}/me/traveler-styles-catalog`, () =>
                HttpResponse.json(travelerStylesCatalogWireFixture)
            )
        );
        const catalog = await fetchTravelerStylesCatalog();
        expect(catalog).toEqual(
            travelerStylesCatalogWireFixture.traveler_styles
        );
    });

    it('fetchTravelerStylesCatalog throws on error', async () => {
        server.use(
            http.get(
                `${API_BASE}/me/traveler-styles-catalog`,
                () => new HttpResponse(null, { status: 500 })
            )
        );
        await expect(fetchTravelerStylesCatalog()).rejects.toThrow(
            '/me/traveler-styles-catalog 500'
        );
    });

    it('fetchGendersCatalog returns genders and sends the bearer token', async () => {
        setAuthToken('test-token');
        let authHeader: string | null = null;
        server.use(
            http.get(`${API_BASE}/me/genders-catalog`, ({ request }) => {
                authHeader = request.headers.get('authorization');
                return HttpResponse.json(gendersCatalogWireFixture);
            })
        );
        const genders = await fetchGendersCatalog();
        expect(genders).toEqual(gendersCatalogWireFixture.genders);
        expect(authHeader).toBe('Bearer test-token');
    });

    it('fetchGendersCatalog throws on error', async () => {
        server.use(
            http.get(
                `${API_BASE}/me/genders-catalog`,
                () => new HttpResponse(null, { status: 403 })
            )
        );
        await expect(fetchGendersCatalog()).rejects.toThrow(
            '/me/genders-catalog 403'
        );
    });
});
