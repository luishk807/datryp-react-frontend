import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';
import {
    CityDetailsResponseWireContract,
    CityFactsResponseWireContract,
    CityListsResponseWireContract,
    CityProseResponseWireContract,
} from '../test/contracts/cityDetails.contract';
import {
    cityFactsSliceFixture,
    cityListsSliceFixture,
    cityProseSliceFixture,
    fullCityDetailsResponseFixture,
    minimalCityDetailsResponseFixture,
} from '../test/fixtures/cityDetails';
import {
    fetchCityDetails,
    fetchCityFacts,
    fetchCityLists,
    fetchCityProse,
} from './cityDetailsApi';

const API_BASE = 'http://localhost:8000';
const fullUrl = `${API_BASE}/city-details`;
const proseUrl = `${API_BASE}/city-details/prose`;
const listsUrl = `${API_BASE}/city-details/lists`;
const factsUrl = `${API_BASE}/city-details/facts`;

// vi is imported per the harness convention even though these tests drive the
// real clients through MSW rather than spying.
void vi;

describe('cityDetailsApi contract', () => {
    beforeEach(() => {
        server.resetHandlers();
    });

    it('fixtures satisfy the wire contracts', () => {
        expect(() =>
            CityDetailsResponseWireContract.parse(fullCityDetailsResponseFixture)
        ).not.toThrow();
        expect(() =>
            CityDetailsResponseWireContract.parse(
                minimalCityDetailsResponseFixture
            )
        ).not.toThrow();
        expect(() =>
            CityProseResponseWireContract.parse(cityProseSliceFixture)
        ).not.toThrow();
        expect(() =>
            CityListsResponseWireContract.parse(cityListsSliceFixture)
        ).not.toThrow();
        expect(() =>
            CityFactsResponseWireContract.parse(cityFactsSliceFixture)
        ).not.toThrow();
    });

    describe('GET /city-details (fetchCityDetails)', () => {
        it('forwards name/country/code/lang and reshapes the full payload', async () => {
            let params: URLSearchParams | null = null;
            server.use(
                http.get(fullUrl, ({ request }) => {
                    params = new URL(request.url).searchParams;
                    return HttpResponse.json(fullCityDetailsResponseFixture);
                })
            );
            const result = await fetchCityDetails('Kyoto', 'Japan', 'JP');

            expect(params!.get('name')).toBe('Kyoto');
            expect(params!.get('country')).toBe('Japan');
            expect(params!.get('code')).toBe('JP');
            expect(params!.get('lang')).toBeTruthy();

            expect(result.cached).toBe(true);
            expect(result.city).toEqual({
                name: 'Kyoto',
                country: 'Japan',
                countryCode: 'JP',
                countryId: 'jp-uuid',
                imageUrl: 'https://img/kyoto.jpg',
                photographerName: 'Aya',
                photographerUrl: 'https://unsplash/aya',
            });

            const d = result.details;
            // Facts-group renames.
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
            expect(d.coordinates).toEqual({ lat: 35.01, lng: 135.77 });
            expect(d.travelBasics).toEqual({
                preferredTransport: 'train',
                transportSystem: 'JR + subway',
                paymentMethod: 'mixed',
                paymentNote: 'IC cards everywhere',
                language: 'Japanese',
                vibe: 'traditional',
                audience: 'all travelers',
                ageRecommendation: 'all ages',
            });
            expect(d.lodging).toMatchObject({
                recommendedType: 'ryokan',
                airbnbAvailability: 'limited',
                hotelAvailability: 'common',
                priceRange: '$$-$$$',
                bookingTip: 'Reserve 2 months ahead',
            });
            expect(d.visa).toEqual({
                destinationCountryCode: 'JP',
                visaFreeCountries: ['US', 'CA'],
                visaOnArrivalCountries: [],
                summary: '90 days visa-free for many passports.',
            });
            expect(d.airports).toEqual([
                {
                    iataCode: 'KIX',
                    name: 'Kansai International',
                    distanceKm: 100,
                    international: true,
                },
            ]);
            expect(d.costLevel).toBe(4);
            expect(d.touristRating).toBe(5);
            expect(d.popularity).toEqual({
                score: 88,
                trend: 'rising',
                summary: 'Post-pandemic surge',
            });
            expect(d.walkability).toEqual({
                rating: 4,
                note: 'Very walkable downtown',
            });
            expect(d.greatFor).toEqual(['culture', 'food']);

            // Prose-group.
            expect(d.longDescription).toBe(
                'Kyoto is the cultural heart of Japan.'
            );
            expect(d.culturalShock).toBe('Quiet trains, cash still common.');
            expect(d.beforeYouGo).toEqual(['Get an IC card', 'Book temples']);
            expect(d.hiddenGems).toEqual([
                { name: 'Philosopher’s Path', why: 'Cherry-lined canal' },
            ]);
            expect(d.neighborhoods).toEqual({
                best: ['Gion', 'Arashiyama'],
                avoid: [],
            });

            // Lists-group: toNamedTip images + nearby image_url ?? null.
            expect(d.topPlaces?.[0]).toMatchObject({
                name: 'Fushimi Inari',
                imageUrl: 'https://img/inari.jpg',
                photographerName: 'Ken',
            });
            expect(d.topPlaces?.[1]).toMatchObject({
                name: 'Kinkaku-ji',
                imageUrl: undefined,
                photographerName: undefined,
                photographerUrl: undefined,
            });
            expect(d.nearbyDestinations?.[0]).toMatchObject({
                name: 'Osaka',
                imageUrl: 'https://img/osaka.jpg',
            });
            expect(d.nearbyDestinations?.[1]).toMatchObject({
                name: 'Nara',
                imageUrl: null,
            });
            expect(d.localFlavor).toEqual({
                funLevel: 3,
                nightlife: 'Low-key izakayas',
                famousLiquor: 'Sake',
                uniqueSouvenir: 'Yatsuhashi sweets',
                mustDoBeforeLeaving: [
                    { name: 'Tea ceremony', why: 'Quintessential Kyoto' },
                ],
            });
        });

        it('applies null/empty defaults for a minimal payload', async () => {
            server.use(
                http.get(fullUrl, () =>
                    HttpResponse.json(minimalCityDetailsResponseFixture)
                )
            );
            const result = await fetchCityDetails('Nowhere', 'Void', 'XX');

            expect(result.city.countryId).toBeNull();
            expect(result.city.imageUrl).toBeNull();

            const d = result.details;
            expect(d.airports).toEqual([]);
            expect(d.touristRating).toBe(0);
            expect(d.greatFor).toEqual([]);
            expect(d.popularity).toBeUndefined();
            expect(d.walkability).toBeUndefined();
            expect(d.culturalShock).toBeUndefined();
            expect(d.beforeYouGo).toBeUndefined();
            expect(d.hiddenGems).toBeUndefined();
            expect(d.neighborhoods).toBeUndefined();
            expect(d.topPlaces).toEqual([]);
            expect(d.nearbyDestinations).toEqual([]);
            expect(d.costLevel).toBe(2);
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(fullUrl, () => new HttpResponse(null, { status: 500 }))
            );
            await expect(
                fetchCityDetails('Kyoto', 'Japan', 'JP')
            ).rejects.toThrow(/\/city-details failed: 500/);
        });
    });

    describe('GET /city-details/prose (fetchCityProse)', () => {
        it('reshapes the prose slice and coerces hidden_gems.why ?? ""', async () => {
            let params: URLSearchParams | null = null;
            server.use(
                http.get(proseUrl, ({ request }) => {
                    params = new URL(request.url).searchParams;
                    return HttpResponse.json(cityProseSliceFixture);
                })
            );
            const result = await fetchCityProse('Kyoto', 'Japan', 'JP');

            expect(params!.get('name')).toBe('Kyoto');
            expect(params!.get('lang')).toBeTruthy();
            expect(result.cached).toBe(true);
            expect(result.city.countryCode).toBe('JP');
            expect(result.details.longDescription).toBe(
                'Kyoto is the cultural heart of Japan.'
            );
            expect(result.details.hiddenGems).toEqual([
                { name: 'Philosopher’s Path', why: '' },
            ]);
            expect(result.details.neighborhoods).toEqual({
                best: ['Gion'],
                avoid: ['Kabukicho-style clip joints'],
            });
        });

        it('drops nameless hidden_gems and defaults missing neighborhood arrays', async () => {
            server.use(
                http.get(proseUrl, () =>
                    HttpResponse.json({
                        city: cityProseSliceFixture.city,
                        cached: false,
                        prose: {
                            long_description: 'x',
                            country_description: 'y',
                            budget_description: 'z',
                            city_highlight: 'a',
                            country_highlight: 'b',
                            weather: 'c',
                            best_time_to_visit: 'd',
                            worst_time_to_visit: 'e',
                            hidden_gems: [
                                { why: 'no name — filtered out' },
                                { name: 'Keeper', why: 'kept' },
                            ],
                            neighborhoods: {}, // both best & avoid omitted → []
                        },
                    })
                )
            );
            const result = await fetchCityProse('Kyoto', 'Japan', 'JP');
            expect(result.details.hiddenGems).toEqual([
                { name: 'Keeper', why: 'kept' },
            ]);
            expect(result.details.neighborhoods).toEqual({
                best: [],
                avoid: [],
            });
            expect(result.details.culturalShock).toBeUndefined();
            expect(result.details.beforeYouGo).toBeUndefined();
        });

        it('leaves hiddenGems/neighborhoods undefined when omitted', async () => {
            server.use(
                http.get(proseUrl, () =>
                    HttpResponse.json({
                        city: cityProseSliceFixture.city,
                        cached: false,
                        prose: {
                            long_description: 'x',
                            country_description: 'y',
                            budget_description: 'z',
                            city_highlight: 'a',
                            country_highlight: 'b',
                            weather: 'c',
                            best_time_to_visit: 'd',
                            worst_time_to_visit: 'e',
                        },
                    })
                )
            );
            const result = await fetchCityProse('Kyoto', 'Japan', 'JP');
            expect(result.details.hiddenGems).toBeUndefined();
            expect(result.details.neighborhoods).toBeUndefined();
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(proseUrl, () => new HttpResponse(null, { status: 502 }))
            );
            await expect(
                fetchCityProse('Kyoto', 'Japan', 'JP')
            ).rejects.toThrow(/\/city-details\/prose failed: 502/);
        });
    });

    describe('GET /city-details/lists (fetchCityLists)', () => {
        it('reshapes named tips, nearby image_url ?? null, and local flavor', async () => {
            server.use(
                http.get(listsUrl, () =>
                    HttpResponse.json(cityListsSliceFixture)
                )
            );
            const details = await fetchCityLists('Kyoto', 'Japan', 'JP');
            expect(details.foods?.[0]).toMatchObject({
                name: 'Fushimi Inari',
                imageUrl: 'https://img/inari.jpg',
            });
            expect(details.nearbyDestinations?.[1]).toMatchObject({
                name: 'Nara',
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
                            top_places: [],
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
            const details = await fetchCityLists('Kyoto', 'Japan', 'JP');
            expect(details.localFlavor).toBeUndefined();
            expect(details.topPlaces).toEqual([]);
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(listsUrl, () => new HttpResponse(null, { status: 503 }))
            );
            await expect(
                fetchCityLists('Kyoto', 'Japan', 'JP')
            ).rejects.toThrow(/\/city-details\/lists failed: 503/);
        });
    });

    describe('GET /city-details/facts (fetchCityFacts)', () => {
        it('reshapes the full facts slice', async () => {
            server.use(
                http.get(factsUrl, () =>
                    HttpResponse.json(cityFactsSliceFixture)
                )
            );
            const details = await fetchCityFacts('Kyoto', 'Japan', 'JP');
            expect(details.currency?.ratePerUsd).toBe(150);
            expect(details.coordinates).toEqual({ lat: 35.01, lng: 135.77 });
            expect(details.walkability).toEqual({
                rating: 4,
                note: 'Very walkable',
            });
            expect(details.greatFor).toEqual(['culture', 'food']);
            expect(details.touristRating).toBe(5);
            expect(details.airports).toHaveLength(1);
        });

        it('defaults every nullable facts sub-object', async () => {
            server.use(
                http.get(factsUrl, () =>
                    HttpResponse.json({
                        cached: false,
                        facts: {
                            currency: null,
                            safety: null,
                            coordinates: null,
                            travel_basics: null,
                            lodging: null,
                            cost_level: 3,
                            visa: null,
                        },
                    })
                )
            );
            const details = await fetchCityFacts('Kyoto', 'Japan', 'JP');
            expect(details.currency).toBeUndefined();
            expect(details.safety).toBeUndefined();
            expect(details.coordinates).toBeUndefined();
            expect(details.travelBasics).toBeUndefined();
            expect(details.lodging).toBeUndefined();
            expect(details.visa).toBeUndefined();
            expect(details.popularity).toBeUndefined();
            expect(details.walkability).toBeUndefined();
            expect(details.costLevel).toBe(3);
            expect(details.touristRating).toBe(0);
            expect(details.airports).toEqual([]);
            expect(details.greatFor).toEqual([]);
        });

        it('drops walkability when rating < 1 and coerces a null note to ""', async () => {
            server.use(
                http.get(factsUrl, () =>
                    HttpResponse.json({
                        cached: false,
                        facts: {
                            currency: null,
                            safety: null,
                            coordinates: null,
                            travel_basics: null,
                            lodging: null,
                            cost_level: 1,
                            visa: null,
                            walkability: { rating: 0, note: 'ignored' },
                        },
                    })
                )
            );
            const zeroRating = await fetchCityFacts('Kyoto', 'Japan', 'JP');
            expect(zeroRating.walkability).toBeUndefined();

            server.resetHandlers();
            server.use(
                http.get(factsUrl, () =>
                    HttpResponse.json({
                        cached: false,
                        facts: {
                            currency: null,
                            safety: null,
                            coordinates: null,
                            travel_basics: null,
                            lodging: null,
                            cost_level: 1,
                            visa: null,
                            walkability: { rating: 2, note: null },
                        },
                    })
                )
            );
            const nullNote = await fetchCityFacts('Kyoto', 'Japan', 'JP');
            expect(nullNote.walkability).toEqual({ rating: 2, note: '' });
        });

        it('throws a descriptive error on a non-OK response', async () => {
            server.use(
                http.get(factsUrl, () => new HttpResponse(null, { status: 500 }))
            );
            await expect(
                fetchCityFacts('Kyoto', 'Japan', 'JP')
            ).rejects.toThrow(/\/city-details\/facts failed: 500/);
        });
    });

    it('contract catches drift (missing / extra / wrong-typed)', () => {
        const missing = {
            ...fullCityDetailsResponseFixture,
            details: { ...fullCityDetailsFixtureWithout('long_description') },
        };
        expect(() =>
            CityDetailsResponseWireContract.parse(missing)
        ).toThrow();

        expect(() =>
            CityDetailsResponseWireContract.parse({
                ...fullCityDetailsResponseFixture,
                mystery_field: true,
            })
        ).toThrow();

        expect(() =>
            CityDetailsResponseWireContract.parse({
                ...fullCityDetailsResponseFixture,
                details: {
                    ...fullCityDetailsResponseFixture.details,
                    cost_level: 'five',
                },
            })
        ).toThrow();

        // Nested drift: currency.rate_per_usd must be a number.
        expect(() =>
            CityDetailsResponseWireContract.parse({
                ...fullCityDetailsResponseFixture,
                details: {
                    ...fullCityDetailsResponseFixture.details,
                    currency: { code: 'JPY', name: 'Yen', rate_per_usd: '150' },
                },
            })
        ).toThrow();
    });
});

// Helper: clone the full detail body minus one required key, to prove the
// contract rejects a missing field.
function fullCityDetailsFixtureWithout(key: string) {
    const clone: Record<string, unknown> = {
        ...fullCityDetailsResponseFixture.details,
    };
    delete clone[key];
    return clone;
}
