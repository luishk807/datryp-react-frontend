import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    CountryDetailsResponseWireContract,
    CountryFactsResponseWireContract,
    CountryListsResponseWireContract,
    CountryProseResponseWireContract,
} from '../test/contracts/countryDetails.contract';
import {
    countryFactsSliceFixture,
    countryListsSliceFixture,
    countryProseSliceFixture,
    fullCountryDetailsResponseFixture,
    minimalCountryDetailsResponseFixture,
} from '../test/fixtures/countryDetails';
import {
    fetchCountryDetails,
    fetchCountryFacts,
    fetchCountryLists,
    fetchCountryProse,
} from './countryDetailsApi';

const API_BASE = 'http://localhost:8000';
const fullUrl = `${API_BASE}/country-details`;
const proseUrl = `${API_BASE}/country-details/prose`;
const listsUrl = `${API_BASE}/country-details/lists`;
const factsUrl = `${API_BASE}/country-details/facts`;

void vi;

describe('countryDetailsApi contract', () => {
    beforeEach(() => {
        server.resetHandlers();
    });

    it('fixtures satisfy the wire contracts', () => {
        expect(() =>
            CountryDetailsResponseWireContract.parse(
                fullCountryDetailsResponseFixture
            )
        ).not.toThrow();
        expect(() =>
            CountryDetailsResponseWireContract.parse(
                minimalCountryDetailsResponseFixture
            )
        ).not.toThrow();
        expect(() =>
            CountryProseResponseWireContract.parse(countryProseSliceFixture)
        ).not.toThrow();
        expect(() =>
            CountryListsResponseWireContract.parse(countryListsSliceFixture)
        ).not.toThrow();
        expect(() =>
            CountryFactsResponseWireContract.parse(countryFactsSliceFixture)
        ).not.toThrow();
    });

    describe('GET /country-details (fetchCountryDetails)', () => {
        it('forwards code/lang and reshapes the full payload', async () => {
            let params: URLSearchParams | null = null;
            server.use(
                http.get(fullUrl, ({ request }) => {
                    params = new URL(request.url).searchParams;
                    return HttpResponse.json(fullCountryDetailsResponseFixture);
                })
            );
            const result = await fetchCountryDetails('JP');

            expect(params!.get('code')).toBe('JP');
            expect(params!.get('lang')).toBeTruthy();

            expect(result.cached).toBe(true);
            expect(result.country).toEqual({
                id: 'jp-uuid',
                name: 'Japan',
                code: 'JP',
                local: '日本',
                image: 'https://img/japan.jpg',
                photographerName: 'Aya',
                photographerUrl: 'https://unsplash/aya',
            });

            const d = result.details;
            expect(d.capitalCity).toBe('Tokyo');
            expect(d.capitalCoordinates).toEqual({ lat: 35.68, lng: 139.69 });
            expect(d.currency).toEqual({
                code: 'JPY',
                name: 'Japanese Yen',
                ratePerUsd: 150,
            });
            expect(d.safety).toEqual({
                score: 92,
                level: 'low',
                summary: 'Very safe, normal precautions.',
            });
            expect(d.travelBasics).toMatchObject({
                preferredTransport: 'train',
                transportSystem: 'Shinkansen + local rail',
                paymentMethod: 'mixed',
                ageRecommendation: 'all ages',
            });
            expect(d.lodging).toMatchObject({
                recommendedType: 'business hotel',
                airbnbAvailability: 'limited',
                hotelAvailability: 'common',
                bookingTip: 'Reserve early in cherry season',
            });
            expect(d.visa).toEqual({
                destinationCountryCode: 'JP',
                visaFreeCountries: ['US', 'CA'],
                visaOnArrivalCountries: [],
                summary: '90 days visa-free for many passports.',
            });
            expect(d.airports).toEqual([
                {
                    iataCode: 'NRT',
                    name: 'Narita International',
                    distanceKm: 60,
                    international: true,
                },
            ]);
            expect(d.costLevel).toBe(4);
            expect(d.touristRating).toBe(5);
            expect(d.popularity).toEqual({
                score: 90,
                trend: 'rising',
                summary: 'Weak yen boom',
            });
            expect(d.culturalShock).toBe('Silence on trains, cash culture.');
            expect(d.beforeYouGo).toEqual(['Get a JR Pass', 'Carry cash']);
            expect(d.hiddenGems).toEqual([
                { name: 'Naoshima', why: 'Art island' },
            ]);

            expect(d.topCities?.[0]).toMatchObject({
                name: 'Tokyo',
                imageUrl: 'https://img/tokyo.jpg',
            });
            expect(d.topCities?.[1]).toMatchObject({
                name: 'Kyoto',
                imageUrl: undefined,
            });
            expect(d.nearbyDestinations?.[0]).toMatchObject({
                name: 'Seoul',
                imageUrl: 'https://img/seoul.jpg',
            });
            expect(d.nearbyDestinations?.[1]).toMatchObject({
                name: 'Taipei',
                imageUrl: null,
            });
            expect(d.localFlavor).toEqual({
                funLevel: 3,
                nightlife: 'Izakayas and karaoke',
                famousLiquor: 'Sake',
                uniqueSouvenir: 'Kit Kat flavors',
                mustDoBeforeLeaving: [
                    { name: 'Onsen soak', why: 'Peak relaxation' },
                ],
            });
        });

        it('applies null/empty defaults for a minimal payload', async () => {
            server.use(
                http.get(fullUrl, () =>
                    HttpResponse.json(minimalCountryDetailsResponseFixture)
                )
            );
            const result = await fetchCountryDetails('XX');

            expect(result.country.local).toBeNull();
            expect(result.country.image).toBeNull();

            const d = result.details;
            expect(d.capitalCoordinates).toBeUndefined();
            expect(d.airports).toEqual([]);
            expect(d.touristRating).toBe(0);
            expect(d.popularity).toBeUndefined();
            expect(d.culturalShock).toBeUndefined();
            expect(d.beforeYouGo).toBeUndefined();
            expect(d.hiddenGems).toBeUndefined();
            expect(d.topCities).toEqual([]);
            expect(d.nearbyDestinations).toEqual([]);
            expect(d.costLevel).toBe(2);
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(fullUrl, () => new HttpResponse(null, { status: 500 }))
            );
            await expect(fetchCountryDetails('JP')).rejects.toThrow(
                /\/country-details failed: 500/
            );
        });
    });

    describe('GET /country-details/prose (fetchCountryProse)', () => {
        it('reshapes prose, capital coords, and hidden_gems.why ?? ""', async () => {
            let params: URLSearchParams | null = null;
            server.use(
                http.get(proseUrl, ({ request }) => {
                    params = new URL(request.url).searchParams;
                    return HttpResponse.json(countryProseSliceFixture);
                })
            );
            const result = await fetchCountryProse('JP');

            expect(params!.get('code')).toBe('JP');
            expect(params!.get('lang')).toBeTruthy();
            expect(result.cached).toBe(true);
            expect(result.country.code).toBe('JP');
            expect(result.details.capitalCoordinates).toEqual({
                lat: 35.68,
                lng: 139.69,
            });
            expect(result.details.hiddenGems).toEqual([
                { name: 'Naoshima', why: '' },
            ]);
        });

        it('drops nameless hidden_gems and leaves optionals undefined', async () => {
            server.use(
                http.get(proseUrl, () =>
                    HttpResponse.json({
                        country: countryProseSliceFixture.country,
                        cached: false,
                        prose: {
                            long_description: 'x',
                            capital_city: 'Cap',
                            budget_description: 'z',
                            country_highlight: 'b',
                            weather: 'c',
                            best_time_to_visit: 'd',
                            worst_time_to_visit: 'e',
                            hidden_gems: [
                                { why: 'no name — filtered' },
                                { name: 'Keeper', why: 'kept' },
                            ],
                        },
                    })
                )
            );
            const result = await fetchCountryProse('JP');
            expect(result.details.capitalCoordinates).toBeUndefined();
            expect(result.details.hiddenGems).toEqual([
                { name: 'Keeper', why: 'kept' },
            ]);
            expect(result.details.culturalShock).toBeUndefined();
            expect(result.details.beforeYouGo).toBeUndefined();
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(proseUrl, () => new HttpResponse(null, { status: 502 }))
            );
            await expect(fetchCountryProse('JP')).rejects.toThrow(
                /\/country-details\/prose failed: 502/
            );
        });
    });

    describe('GET /country-details/lists (fetchCountryLists)', () => {
        it('reshapes named tips, nearby image_url ?? null, and local flavor', async () => {
            server.use(
                http.get(listsUrl, () =>
                    HttpResponse.json(countryListsSliceFixture)
                )
            );
            const details = await fetchCountryLists('JP');
            expect(details.topCities?.[0]).toMatchObject({
                name: 'Tokyo',
                imageUrl: 'https://img/tokyo.jpg',
            });
            expect(details.nearbyDestinations?.[1]).toMatchObject({
                name: 'Taipei',
                imageUrl: null,
            });
            expect(details.localFlavor?.funLevel).toBe(3);
        });

        it('leaves localFlavor undefined when local_flavor is null', async () => {
            server.use(
                http.get(listsUrl, () =>
                    HttpResponse.json({
                        cached: false,
                        lists: {
                            top_cities: [],
                            foods: [],
                            things_to_do: [],
                            photo_spots: [],
                            notes_to_know: [],
                            nearby_destinations: [],
                            local_flavor: null,
                        },
                    })
                )
            );
            const details = await fetchCountryLists('JP');
            expect(details.localFlavor).toBeUndefined();
            expect(details.topCities).toEqual([]);
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(listsUrl, () => new HttpResponse(null, { status: 503 }))
            );
            await expect(fetchCountryLists('JP')).rejects.toThrow(
                /\/country-details\/lists failed: 503/
            );
        });
    });

    describe('GET /country-details/facts (fetchCountryFacts)', () => {
        it('reshapes the full facts slice', async () => {
            server.use(
                http.get(factsUrl, () =>
                    HttpResponse.json(countryFactsSliceFixture)
                )
            );
            const details = await fetchCountryFacts('JP');
            expect(details.currency?.ratePerUsd).toBe(150);
            expect(details.travelBasics?.preferredTransport).toBe('train');
            expect(details.touristRating).toBe(5);
            expect(details.airports).toHaveLength(1);
            expect(details.popularity).toEqual({
                score: 90,
                trend: 'steady',
                summary: 'Perennial favorite',
            });
        });

        it('defaults every nullable facts sub-object', async () => {
            server.use(
                http.get(factsUrl, () =>
                    HttpResponse.json({
                        cached: false,
                        facts: {
                            currency: null,
                            safety: null,
                            travel_basics: null,
                            lodging: null,
                            cost_level: 3,
                            visa: null,
                        },
                    })
                )
            );
            const details = await fetchCountryFacts('JP');
            expect(details.currency).toBeUndefined();
            expect(details.safety).toBeUndefined();
            expect(details.travelBasics).toBeUndefined();
            expect(details.lodging).toBeUndefined();
            expect(details.visa).toBeUndefined();
            expect(details.popularity).toBeUndefined();
            expect(details.costLevel).toBe(3);
            expect(details.touristRating).toBe(0);
            expect(details.airports).toEqual([]);
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(factsUrl, () => new HttpResponse(null, { status: 500 }))
            );
            await expect(fetchCountryFacts('JP')).rejects.toThrow(
                /\/country-details\/facts failed: 500/
            );
        });
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missingDetails: Record<string, unknown> = {
            ...fullCountryDetailsResponseFixture.details,
        };
        delete missingDetails.long_description;
        expect(() =>
            CountryDetailsResponseWireContract.parse({
                ...fullCountryDetailsResponseFixture,
                details: missingDetails,
            })
        ).toThrow();

        expect(() =>
            CountryDetailsResponseWireContract.parse({
                ...fullCountryDetailsResponseFixture,
                mystery_field: true,
            })
        ).toThrow();

        expect(() =>
            CountryDetailsResponseWireContract.parse({
                ...fullCountryDetailsResponseFixture,
                details: {
                    ...fullCountryDetailsResponseFixture.details,
                    cost_level: 'four',
                },
            })
        ).toThrow();

        // Nested drift: safety.level must be one of the enum values.
        expect(() =>
            CountryDetailsResponseWireContract.parse({
                ...fullCountryDetailsResponseFixture,
                details: {
                    ...fullCountryDetailsResponseFixture.details,
                    safety: { score: 10, level: 'nuclear', summary: 'x' },
                },
            })
        ).toThrow();
    });
});
