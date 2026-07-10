import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND, ITINERARY_TYPE, TRIP_BASIC, TRIP_STATUS } from 'constants';
import type {
    ApiActivity,
    ApiCountry,
    ApiItinerary,
    ApiItineraryDate,
    ApiTransport,
    ApiTransportLeg,
    ApiUserPublic,
    ApiDestination,
} from 'api/hooks/useItineraries';
import type { Activity, FlightInfo, SingleDestination, MultipleDestinations } from 'types';
import {
    apiIsSingleTrip,
    apiToTripEntry,
    apiToTripState,
    isCurrentUserOrganizer,
} from './itineraryAdapter';

// ---- fixture factories ----
const apiUser = (id: string, name: string | null = 'User', email = `${id}@e.com`): ApiUserPublic => ({
    id,
    name,
    email,
});

const apiCountry = (id = 'country-uuid', name = 'Japan'): ApiCountry => ({
    id,
    name,
    code: 'JP',
    local: null,
    image: null,
});

const apiLeg = (o: Partial<ApiTransportLeg> = {}): ApiTransportLeg => ({
    legIndex: 0,
    departPoint: null,
    arrivePoint: null,
    departAt: null,
    arriveAt: null,
    carrier: null,
    number: null,
    seatOrClass: null,
    ...o,
});

const apiTransport = (o: Partial<ApiTransport> = {}): ApiTransport => ({
    mode: 'flight',
    departPoint: null,
    arrivePoint: null,
    departAt: null,
    arriveAt: null,
    carrier: null,
    number: null,
    cost: null,
    paidBy: null,
    paidAt: null,
    budgets: [],
    legs: [],
    ...o,
});

const apiActivity = (o: Partial<ApiActivity> = {}): ApiActivity => ({
    id: 'act-uuid',
    name: 'Act',
    place: null,
    location: null,
    startTime: null,
    endTime: null,
    cost: null,
    notes: null,
    image: null,
    budget: null,
    status: null,
    budgets: [],
    paidAt: null,
    paidBy: null,
    kind: null,
    transport: null,
    placeKey: null,
    placeCity: null,
    placeCountry: null,
    countryCode: null,
    latitude: null,
    longitude: null,
    sourceUrl: null,
    googleRating: null,
    googleRatingCount: null,
    openaiRating: null,
    ...o,
});

const apiDay = (o: Partial<ApiItineraryDate> = {}): ApiItineraryDate => ({
    id: 'day-uuid',
    date: '2026-05-14',
    country: null,
    transport: null,
    activities: [],
    ...o,
});

const apiDestination = (o: Partial<ApiDestination> = {}): ApiDestination => ({
    id: 'dest-uuid',
    country: apiCountry(),
    transport: null,
    startDate: '2026-05-14',
    endDate: '2026-05-16',
    order: 0,
    note: null,
    intenaryDates: [],
    ...o,
});

const apiItinerary = (o: Partial<ApiItinerary> = {}): ApiItinerary => ({
    id: 'itin-uuid',
    name: 'Trip',
    startDate: '2026-05-14',
    endDate: '2026-05-20',
    budget: 1000,
    image: null,
    note: null,
    status: { id: 'status-uuid', name: TRIP_STATUS.PLANNING },
    interaryType: { id: 'it-uuid', name: ITINERARY_TYPE.SINGLE },
    user: apiUser('owner-uuid', 'Owner'),
    friends: [],
    organizers: [],
    country: apiCountry(),
    transport: null,
    intenaryDates: [],
    destinations: [],
    ...o,
});

/** Map a single ApiActivity through the single-trip path. */
const mapActivity = (o: Partial<ApiActivity> = {}): Activity =>
    apiToTripState(apiItinerary({ intenaryDates: [apiDay({ activities: [apiActivity(o)] })] }))
        .destinations[0].itinerary[0].activities[0];

/** Map an ApiTransport into the single-trip flightInfo. */
const mapFlightInfo = (transport: ApiTransport | null): FlightInfo | undefined =>
    apiToTripState(apiItinerary({ transport })).destinations[0].flightInfo;

describe('apiIsSingleTrip', () => {
    it('is true for the single-destination type name', () => {
        expect(apiIsSingleTrip(apiItinerary())).toBe(true);
    });

    it('is false for the multi-destination type name', () => {
        expect(
            apiIsSingleTrip(apiItinerary({ interaryType: { id: 'm', name: ITINERARY_TYPE.MULTI } }))
        ).toBe(false);
    });
});

describe('apiActivityToActivity — scalar fields', () => {
    it('maps every scalar and preserves the backend UUID as apiId', () => {
        const a = mapActivity({
            id: 'act-1',
            kind: ACTIVITY_KIND.PLACE,
            name: 'Museum',
            place: 'Louvre',
            location: 'Paris',
            startTime: '2026-05-14T10:30:00',
            endTime: '2026-05-14T12:00:00',
            cost: 25,
            notes: 'bring camera',
            image: 'img.jpg',
            status: { id: 'st-uuid', name: TRIP_STATUS.CONFIRMED },
            placeKey: 'louvre-paris',
            placeCity: 'Paris',
            placeCountry: 'France',
            countryCode: 'FR',
            latitude: 48.8,
            longitude: 2.3,
            sourceUrl: 'http://x',
            googleRating: 4.5,
            googleRatingCount: 100,
            openaiRating: 4.2,
            paidAt: '2026-05-14T00:00:00',
            paidBy: apiUser('u1', 'Ann'),
        });
        expect(typeof a.id).toBe('number');
        expect(a.apiId).toBe('act-1');
        expect(a.kind).toBe(ACTIVITY_KIND.PLACE);
        expect(a.name).toBe('Museum');
        expect(a.place).toBe('Louvre');
        expect(a.location).toBe('Paris');
        expect(a.startTime).toBe('10:30');
        expect(a.endTime).toBe('12:00');
        expect(a.cost).toBe(25);
        expect(a.note).toBe('bring camera');
        expect(a.image).toEqual({ url: 'img.jpg', name: 'Museum' });
        expect(a.status).toEqual({ id: 'st-uuid', name: TRIP_STATUS.CONFIRMED });
        expect(a.placeKey).toBe('louvre-paris');
        expect(a.placeCity).toBe('Paris');
        expect(a.placeCountry).toBe('France');
        expect(a.countryCode).toBe('FR');
        expect(a.latitude).toBe(48.8);
        expect(a.longitude).toBe(2.3);
        expect(a.sourceUrl).toBe('http://x');
        expect(a.googleRating).toBe(4.5);
        expect(a.googleRatingCount).toBe(100);
        expect(a.openaiRating).toBe(4.2);
        expect(a.paidAt).toBe('2026-05-14'); // ISO collapsed to date
        expect(a.paidBy).toEqual({ id: 'u1', name: 'Ann' });
    });

    it('leaves optional fields undefined/null when the API returns null', () => {
        const a = mapActivity({});
        expect(a.kind).toBeUndefined();
        expect(a.place).toBeUndefined();
        expect(a.location).toBeUndefined();
        expect(a.startTime).toBeUndefined();
        expect(a.endTime).toBeUndefined();
        expect(a.cost).toBeUndefined();
        expect(a.note).toBeUndefined();
        expect(a.image).toBeUndefined();
        expect(a.status).toBeUndefined();
        expect(a.budget).toBeUndefined();
        expect(a.sourceUrl).toBeNull();
        expect(a.googleRating).toBeNull();
        expect(a.paidAt).toBeNull();
        expect(a.paidBy).toBeNull();
        expect(a.flightSegments).toBeUndefined();
        expect(a.transitSegments).toBeUndefined();
    });

    it('keeps a non-ISO paidAt string as-is', () => {
        expect(mapActivity({ paidAt: 'sometime' }).paidAt).toBe('sometime');
    });

    it('maps per-activity budgets to frontend budget items', () => {
        const a = mapActivity({
            budgets: [{ id: 'b1', user: apiUser('u1', 'Ann'), amount: 10 }],
        });
        expect(a.budget).toHaveLength(1);
        expect(a.budget?.[0]).toMatchObject({
            budget: 10,
            user: { label: 'Ann', name: 'Ann', userId: 'u1' },
        });
        expect(typeof a.budget?.[0].id).toBe('number');
        expect(typeof a.budget?.[0].user.id).toBe('number');
    });

    it('falls back to email when a budget user has no name', () => {
        const a = mapActivity({ budgets: [{ id: 'b1', user: apiUser('u1', null), amount: 5 }] });
        expect(a.budget?.[0].user.name).toBe('u1@e.com');
        expect(a.budget?.[0].user.label).toBe('u1@e.com');
    });

    it('returns undefined time for null/invalid startTime', () => {
        expect(mapActivity({ startTime: null }).startTime).toBeUndefined();
        expect(mapActivity({ startTime: 'not-a-date' }).startTime).toBeUndefined();
    });
});

describe('normalizeKind (via apiActivityToActivity)', () => {
    it('preserves every known activity kind', () => {
        for (const kind of Object.values(ACTIVITY_KIND)) {
            expect(mapActivity({ kind }).kind).toBe(kind);
        }
    });

    it('maps an unknown or null kind to undefined', () => {
        expect(mapActivity({ kind: 'bogus-kind' }).kind).toBeUndefined();
        expect(mapActivity({ kind: null }).kind).toBeUndefined();
    });
});

describe('apiActivityTransport (via apiActivityToActivity)', () => {
    it('splits a flight-mode transport into flightSegments', () => {
        const a = mapActivity({
            kind: ACTIVITY_KIND.FLIGHT,
            transport: apiTransport({
                mode: 'flight',
                legs: [
                    apiLeg({
                        departAt: '2026-05-14T08:00:00',
                        arriveAt: '2026-05-14T10:00:00',
                        departPoint: 'JFK',
                        arrivePoint: 'LAX',
                        number: 'AA1',
                        carrier: 'AA',
                        seatOrClass: '2A',
                    }),
                ],
            }),
        });
        expect(a.transitSegments).toBeUndefined();
        expect(a.flightSegments).toEqual([
            {
                departDate: '2026-05-14',
                departTime: '08:00',
                arrivalDate: '2026-05-14',
                arrivalTime: '10:00',
                flightNumber: 'AA1',
                departAirport: 'JFK',
                arrivalAirport: 'LAX',
                carrier: 'AA',
                seatOrClass: '2A',
            },
        ]);
    });

    it('splits a ground-transport mode into transitSegments', () => {
        const a = mapActivity({
            kind: ACTIVITY_KIND.TRAIN,
            transport: apiTransport({
                mode: 'train',
                legs: [
                    apiLeg({
                        departAt: '2026-05-14T09:00:00',
                        arriveAt: '2026-05-14T11:00:00',
                        departPoint: 'Gare',
                        arrivePoint: 'Lyon',
                        number: 'TGV1',
                        carrier: 'SNCF',
                        seatOrClass: '1st',
                    }),
                ],
            }),
        });
        expect(a.flightSegments).toBeUndefined();
        expect(a.transitSegments).toEqual([
            {
                operator: 'SNCF',
                number: 'TGV1',
                departStation: 'Gare',
                arrivalStation: 'Lyon',
                departDate: '2026-05-14',
                departTime: '09:00',
                arrivalDate: '2026-05-14',
                arrivalTime: '11:00',
                classOrSeat: '1st',
            },
        ]);
    });

    it('returns neither segment array for a transport with no legs', () => {
        const a = mapActivity({ transport: apiTransport({ legs: [] }) });
        expect(a.flightSegments).toBeUndefined();
        expect(a.transitSegments).toBeUndefined();
    });
});

describe('apiTransportToFlightInfo (via single-trip flightInfo)', () => {
    it('is undefined when the single trip has no transport', () => {
        expect(mapFlightInfo(null)).toBeUndefined();
    });

    it('maps headline, mode, cost, payer, paidAt and segments', () => {
        const fi = mapFlightInfo(
            apiTransport({
                mode: 'train',
                cost: 500,
                paidBy: apiUser('u1', 'Ann'),
                paidAt: '2026-05-14T00:00:00',
                budgets: [{ id: 'tb1', user: apiUser('u2', 'Bob'), amount: 250 }],
                legs: [
                    apiLeg({
                        departAt: '2026-05-14T08:00:00',
                        arriveAt: '2026-05-14T11:00:00',
                        departPoint: 'A',
                        arrivePoint: 'B',
                        number: 'N1',
                        carrier: 'C1',
                        seatOrClass: 'S1',
                    }),
                    apiLeg({ legIndex: 1, departPoint: 'B', arrivePoint: 'C' }),
                ],
            })
        );
        expect(fi?.mode).toBe(ACTIVITY_KIND.TRAIN);
        expect(fi?.departAirport).toBe('A');
        expect(fi?.arrivalAirport).toBe('B');
        expect(fi?.departDate).toBe('2026-05-14');
        expect(fi?.departTime).toBe('08:00');
        expect(fi?.flightNumber).toBe('N1');
        expect(fi?.carrier).toBe('C1');
        expect(fi?.seatOrClass).toBe('S1');
        expect(fi?.cost).toBe(500);
        expect(fi?.paidBy).toEqual({ id: 'u1', name: 'Ann' });
        expect(fi?.paidAt).toBe('2026-05-14');
        expect(fi?.segments).toHaveLength(2);
        expect(fi?.budgets?.[0]).toMatchObject({ budget: 250, user: { userId: 'u2' } });
    });

    it('keeps paidBy/budgets undefined and paidAt null when unset', () => {
        const fi = mapFlightInfo(apiTransport({ legs: [apiLeg({ departPoint: 'X' })] }));
        expect(fi?.paidBy).toBeNull();
        expect(fi?.paidAt).toBeNull();
        expect(fi?.budgets).toBeUndefined();
        expect(fi?.cost).toBeUndefined();
    });

    it('keeps a non-ISO paidAt string as-is', () => {
        const fi = mapFlightInfo(apiTransport({ paidAt: 'later', legs: [apiLeg()] }));
        expect(fi?.paidAt).toBe('later');
    });

    it('returns an empty object for a null transport in the trip-entry path', () => {
        const entry = apiToTripEntry(apiItinerary({ transport: null })) as SingleDestination;
        expect(entry.flightInfo).toEqual({});
    });
});

describe('apiToTripEntry — single', () => {
    it('applies defaults for a sparse single itinerary', () => {
        const entry = apiToTripEntry(
            apiItinerary({
                name: null,
                startDate: null,
                endDate: null,
                status: null,
                budget: null,
                image: null,
                country: null,
                transport: null,
            })
        ) as SingleDestination & { apiId: string };
        expect(typeof entry.id).toBe('number');
        expect(entry.apiId).toBe('itin-uuid');
        expect(entry.name).toBe('Untitled trip');
        expect(entry.startDate).toBe('');
        expect(entry.endDate).toBe('');
        expect(entry.status).toEqual({ id: 1, name: TRIP_STATUS.PLANNING });
        expect(entry.budget).toBe(0);
        expect(entry.image).toBeUndefined();
        expect(entry.country).toEqual({ id: 0, name: '' });
        expect(entry.flightInfo).toEqual({});
    });

    it('maps country, status, transport and days for a populated single trip', () => {
        const entry = apiToTripEntry(
            apiItinerary({
                country: apiCountry('c1', 'France'),
                transport: apiTransport({ mode: 'flight', legs: [apiLeg({ departPoint: 'CDG' })] }),
                intenaryDates: [apiDay({ date: '2026-05-14', activities: [apiActivity({ name: 'Eiffel' })] })],
                friends: [apiUser('f1', 'Fr')],
                organizers: [apiUser('o1', null)],
            })
        ) as SingleDestination;
        expect(entry.country).toMatchObject({ id: 'c1', name: 'France' });
        expect(entry.status).toEqual({ id: 'status-uuid', name: TRIP_STATUS.PLANNING });
        expect(entry.flightInfo.departAirport).toBe('CDG');
        expect(entry.intenaryDates).toHaveLength(1);
        expect(entry.intenaryDates[0].activities[0].name).toBe('Eiffel');
        expect(entry.friends).toHaveLength(1);
        // organizer with a null name falls back to its email.
        expect(entry.organizers[0].name).toBe('o1@e.com');
    });
});

describe('apiToTripEntry — multi', () => {
    it('maps per-day country and flightInfo, no top-level country', () => {
        const entry = apiToTripEntry(
            apiItinerary({
                interaryType: { id: 'm', name: ITINERARY_TYPE.MULTI },
                intenaryDates: [
                    apiDay({
                        country: apiCountry('c1', 'France'),
                        transport: apiTransport({ mode: 'flight', legs: [apiLeg({ departPoint: 'CDG' })] }),
                        activities: [apiActivity()],
                    }),
                    apiDay({ id: 'd2', date: '2026-05-15', country: null, activities: [] }),
                ],
            })
        ) as MultipleDestinations;
        expect(entry.intenaryDates).toHaveLength(2);
        expect(entry.intenaryDates[0].country).toMatchObject({ id: 'c1' });
        expect(entry.intenaryDates[0].flightInfo.departAirport).toBe('CDG');
        expect(entry.intenaryDates[0].activities).toHaveLength(1);
        // Missing per-day country defaults to the empty placeholder.
        expect(entry.intenaryDates[1].country).toEqual({ id: 0, name: '' });
    });
});

describe('apiToTripState — single', () => {
    it('produces a single destination with the SINGLE trip type and friends/organizers', () => {
        const ts = apiToTripState(
            apiItinerary({
                transport: apiTransport({ mode: 'flight', legs: [apiLeg({ departPoint: 'CDG' })] }),
                intenaryDates: [apiDay({ activities: [apiActivity({ name: 'Louvre' })] })],
                friends: [apiUser('f1', null)],
                organizers: [apiUser('o1', 'Org')],
            })
        );
        expect(ts.apiId).toBe('itin-uuid');
        expect(ts.type?.id).toBe(TRIP_BASIC.SINGLE.id);
        expect(ts.type?.name).toBe(ITINERARY_TYPE.SINGLE);
        expect(ts.budget).toBe(1000);
        expect(ts.total).toBe(1000);
        expect(ts.destinations).toHaveLength(1);
        expect(ts.destinations[0].country).toMatchObject({ id: 'country-uuid' });
        expect(ts.destinations[0].flightInfo?.departAirport).toBe('CDG');
        expect(ts.destinations[0].itinerary[0].activities[0].name).toBe('Louvre');
        // friend with null name -> label/name fall back to email.
        expect(ts.friends?.[0]).toMatchObject({ label: 'f1@e.com', name: 'f1@e.com', userId: 'f1' });
        expect(ts.organizer?.[0]).toMatchObject({ userId: 'o1', name: 'Org' });
    });

    it('leaves flightInfo undefined when there is no transport', () => {
        const ts = apiToTripState(apiItinerary({ transport: null }));
        expect(ts.destinations[0].flightInfo).toBeUndefined();
    });

    it('defaults name, status, budget and image when the API returns null', () => {
        const ts = apiToTripState(
            apiItinerary({ name: null, status: null, budget: null, image: null })
        );
        expect(ts.name).toBe('');
        expect(ts.status).toBeUndefined();
        expect(ts.budget).toBeUndefined();
        expect(ts.total).toBeUndefined();
        expect(ts.image).toBeUndefined();
    });

    it('carries the status when present', () => {
        const ts = apiToTripState(apiItinerary());
        expect(ts.status).toEqual({ id: 'status-uuid', name: TRIP_STATUS.PLANNING });
    });
});

describe('apiToTripState — multi', () => {
    it('maps first-class date-range destinations', () => {
        const ts = apiToTripState(
            apiItinerary({
                interaryType: { id: 'm', name: ITINERARY_TYPE.MULTI },
                destinations: [
                    apiDestination({
                        id: 'd1',
                        country: apiCountry('c1', 'France'),
                        startDate: '2026-05-14',
                        endDate: '2026-05-16',
                        note: 'first leg',
                        transport: apiTransport({ mode: 'flight', legs: [apiLeg({ departPoint: 'CDG' })] }),
                        intenaryDates: [apiDay({ date: '2026-05-14', activities: [apiActivity()] })],
                    }),
                    apiDestination({
                        id: 'd2',
                        country: null as unknown as ApiCountry,
                        transport: null,
                        note: null,
                        startDate: '2026-05-17',
                        endDate: '2026-05-19',
                        intenaryDates: [],
                    }),
                ],
            })
        );
        expect(ts.type?.id).toBe(TRIP_BASIC.MULTIPLE.id);
        expect(ts.destinations).toHaveLength(2);
        const [d1, d2] = ts.destinations;
        expect(d1.country).toMatchObject({ id: 'c1' });
        expect(d1.startDate).toBe('2026-05-14');
        expect(d1.endDate).toBe('2026-05-16');
        expect(d1.note).toBe('first leg');
        expect(d1.flightInfo?.departAirport).toBe('CDG');
        expect(d1.itinerary).toHaveLength(1);
        // Missing country + transport + note default cleanly.
        expect(d2.country).toEqual({ id: 0, name: '' });
        expect(d2.flightInfo).toBeUndefined();
        expect(d2.note).toBeUndefined();
    });

    it('falls back to per-day single-destinations for a legacy multi trip with no destinations', () => {
        const ts = apiToTripState(
            apiItinerary({
                interaryType: { id: 'm', name: ITINERARY_TYPE.MULTI },
                destinations: [],
                intenaryDates: [
                    apiDay({
                        id: 'd1',
                        date: '2026-05-14',
                        country: apiCountry('c1', 'France'),
                        transport: apiTransport({ mode: 'flight', legs: [apiLeg({ departPoint: 'CDG' })] }),
                        activities: [apiActivity()],
                    }),
                    apiDay({ id: 'd2', date: '2026-05-17', country: null, activities: [] }),
                ],
            })
        );
        expect(ts.destinations).toHaveLength(2);
        const [d1, d2] = ts.destinations;
        expect(d1.startDate).toBe('2026-05-14');
        // endDate = day before the next day's date.
        expect(d1.endDate).toBe('2026-05-16');
        expect(d1.country).toMatchObject({ id: 'c1' });
        expect(d1.flightInfo?.departAirport).toBe('CDG');
        expect(d1.itinerary[0].date).toBe('2026-05-14');
        // Last day has no successor -> endDate falls back to its own date.
        expect(d2.startDate).toBe('2026-05-17');
        expect(d2.endDate).toBe('2026-05-17');
        expect(d2.country).toEqual({ id: 0, name: '' });
        expect(d2.flightInfo).toBeUndefined();
    });

    it('produces an empty destination list for a legacy multi trip with no days', () => {
        const ts = apiToTripState(
            apiItinerary({
                interaryType: { id: 'm', name: ITINERARY_TYPE.MULTI },
                destinations: [],
                intenaryDates: [],
            })
        );
        expect(ts.destinations).toEqual([]);
    });
});

describe('isCurrentUserOrganizer', () => {
    const it_ = apiItinerary({ user: apiUser('owner'), organizers: [apiUser('org1')] });

    it('is false without an itinerary or current user id', () => {
        expect(isCurrentUserOrganizer(undefined, 'owner')).toBe(false);
        expect(isCurrentUserOrganizer(it_, undefined)).toBe(false);
    });

    it('is true when the current user owns the trip', () => {
        expect(isCurrentUserOrganizer(it_, 'owner')).toBe(true);
    });

    it('is true when the current user is an organizer', () => {
        expect(isCurrentUserOrganizer(it_, 'org1')).toBe(true);
    });

    it('is false for an unrelated user', () => {
        expect(isCurrentUserOrganizer(it_, 'stranger')).toBe(false);
    });
});
