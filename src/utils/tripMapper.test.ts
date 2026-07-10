import { describe, it, expect } from 'vitest';
import { ACTIVITY_KIND, TRIP_BASIC, TRIP_STATUS, ITINERARY_TYPE } from 'constants';
import type {
    Activity,
    Destination,
    FlightInfo,
    Friend,
    ItineraryDay,
    TripState,
} from 'types';
import { tripStateToSaveInput, resolveInteraryTypeId, type MapTripOptions } from './tripMapper';

// ---- backend-looking UUIDs (must match tripMapper's UUID_RE) ----
const U1 = '11111111-1111-1111-1111-111111111111';
const U2 = '22222222-2222-2222-2222-222222222222';
const U3 = '33333333-3333-3333-3333-333333333333';
const STATUS_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const COUNTRY_UUID = 'abcdef01-2345-6789-abcd-ef0123456789';

// ---- fixture factories ----
const friend = (id: number, userId?: string): Friend => ({ id, name: `F${id}`, userId });

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
    id: 1,
    name: 'Activity',
    ...overrides,
});

const makeDay = (overrides: Partial<ItineraryDay> = {}): ItineraryDay => ({
    id: 1,
    date: '2026-03-01',
    activities: [],
    ...overrides,
});

const makeDest = (overrides: Partial<Destination> = {}): Destination => ({
    id: 1,
    country: { id: COUNTRY_UUID, name: 'Japan' },
    itinerary: [],
    ...overrides,
});

const singleTrip = (overrides: Partial<TripState> = {}): TripState => ({
    destinations: [makeDest()],
    ...overrides,
});

const multiTrip = (overrides: Partial<TripState> = {}): TripState => ({
    type: { ...TRIP_BASIC.MULTIPLE },
    destinations: [],
    ...overrides,
});

const opts = (overrides: Partial<MapTripOptions> = {}): MapTripOptions => ({
    interaryTypeId: 'single-type-uuid',
    ...overrides,
});

describe('tripStateToSaveInput — single-destination top level', () => {
    it('maps the root fields and keeps single-destination shape', () => {
        const trip = singleTrip({
            name: 'My Trip',
            startDate: '2026-03-01',
            endDate: '2026-03-05',
            budget: '1500',
            image: 'hero.jpg',
            organizer: [friend(1, U1), friend(2)],
            friends: [friend(3, U2), friend(4)],
            destinations: [
                makeDest({
                    country: { id: COUNTRY_UUID, name: 'Japan' },
                    itinerary: [makeDay({ activities: [makeActivity()] })],
                }),
            ],
        });
        const out = tripStateToSaveInput(
            trip,
            opts({ tripStatusId: 'status-uuid', notifyParticipants: false })
        );

        expect(out.interaryTypeId).toBe('single-type-uuid');
        expect(out.name).toBe('My Trip');
        expect(out.startDate).toBe('2026-03-01');
        expect(out.endDate).toBe('2026-03-05');
        expect(out.budget).toBe(1500);
        expect(out.image).toBe('hero.jpg');
        expect(out.tripStatusId).toBe('status-uuid');
        expect(out.organizerIds).toEqual([U1]); // friend(2) has no userId -> dropped
        expect(out.participantIds).toEqual([U2]);
        expect(out.countryId).toBe(COUNTRY_UUID);
        expect(out.destinations).toBeNull();
        expect(out.days).toHaveLength(1);
        expect(out.notifyParticipants).toBe(false);
        expect(out.id).toBeUndefined();
    });

    it('applies option defaults (notify true, status/id null/undefined)', () => {
        const out = tripStateToSaveInput(singleTrip(), opts());
        expect(out.notifyParticipants).toBe(true);
        expect(out.tripStatusId).toBeNull();
        expect(out.id).toBeUndefined();
    });

    it('forwards the existing itinerary id when updating', () => {
        const out = tripStateToSaveInput(singleTrip(), opts({ id: 'itin-123' }));
        expect(out.id).toBe('itin-123');
    });

    it('nulls name/dates/image/budget when the trip omits them', () => {
        const out = tripStateToSaveInput({ destinations: [makeDest()] }, opts());
        expect(out.name).toBeNull();
        expect(out.startDate).toBeNull();
        expect(out.endDate).toBeNull();
        expect(out.image).toBeNull();
        expect(out.budget).toBeNull();
        expect(out.organizerIds).toEqual([]);
        expect(out.participantIds).toEqual([]);
    });

    it('handles a single trip with no destinations at all', () => {
        const out = tripStateToSaveInput({ destinations: [] }, opts());
        expect(out.days).toEqual([]);
        expect(out.countryId).toBeNull();
        expect(out.transport).toBeNull();
        expect(out.destinations).toBeNull();
    });
});

describe('tripStateToSaveInput — countryId resolution', () => {
    it('keeps a real UUID country id', () => {
        const out = tripStateToSaveInput(
            singleTrip({ destinations: [makeDest({ country: { id: COUNTRY_UUID, name: 'X' } })] }),
            opts()
        );
        expect(out.countryId).toBe(COUNTRY_UUID);
    });

    it('drops a numeric placeholder country id to null', () => {
        const out = tripStateToSaveInput(
            singleTrip({ destinations: [makeDest({ country: { id: 0, name: 'Sample' } })] }),
            opts()
        );
        expect(out.countryId).toBeNull();
    });

    it('drops a non-UUID string country id to null', () => {
        const out = tripStateToSaveInput(
            singleTrip({ destinations: [makeDest({ country: { id: 'not-a-uuid', name: 'X' } })] }),
            opts()
        );
        expect(out.countryId).toBeNull();
    });
});

describe('tripStateToSaveInput — activity mapping', () => {
    const mapActivity = (activity: Activity, options: Partial<MapTripOptions> = {}) => {
        const out = tripStateToSaveInput(
            singleTrip({
                destinations: [
                    makeDest({ itinerary: [makeDay({ date: '2026-03-01', activities: [activity] })] }),
                ],
            }),
            opts(options)
        );
        return out.days[0].activities[0];
    };

    it('maps all the scalar fields and combines day+time into datetimes', () => {
        const a = mapActivity(
            makeActivity({
                name: '  Museum  ',
                place: 'Louvre',
                location: 'Paris',
                startTime: '10:30',
                endTime: '12:00',
                cost: '25',
                note: 'bring camera',
                image: { url: 'img.jpg', name: 'x' },
                status: { id: U3, name: TRIP_STATUS.CONFIRMED },
                paidBy: { id: U1, name: 'Ann' },
                paidAt: '2026-03-01',
                kind: ACTIVITY_KIND.PLACE,
                placeCity: 'Paris',
                placeCountry: 'France',
                countryCode: 'FR',
                latitude: 48.8,
                longitude: 2.3,
                sourceUrl: 'http://x',
                googleRating: 4.5,
                googleRatingCount: 100,
                openaiRating: 4.2,
            })
        );
        expect(a.name).toBe('Museum');
        expect(a.place).toBe('Louvre');
        expect(a.location).toBe('Paris');
        expect(a.startTime).toBe('2026-03-01T10:30:00');
        expect(a.endTime).toBe('2026-03-01T12:00:00');
        expect(a.cost).toBe(25);
        expect(a.notes).toBe('bring camera');
        expect(a.image).toBe('img.jpg');
        expect(a.tripStatusId).toBe(U3);
        expect(a.paidByUserId).toBe(U1);
        expect(a.paidAt).toBe('2026-03-01');
        expect(a.kind).toBe(ACTIVITY_KIND.PLACE);
        expect(a.placeCity).toBe('Paris');
        expect(a.placeCountry).toBe('France');
        expect(a.countryCode).toBe('FR');
        expect(a.latitude).toBe(48.8);
        expect(a.longitude).toBe(2.3);
        expect(a.sourceUrl).toBe('http://x');
        expect(a.googleRating).toBe(4.5);
        expect(a.googleRatingCount).toBe(100);
        expect(a.openaiRating).toBe(4.2);
        expect(a.transport).toBeNull();
    });

    it('falls back to "Untitled activity" when the name is blank', () => {
        expect(mapActivity(makeActivity({ name: '   ' })).name).toBe('Untitled activity');
        expect(mapActivity(makeActivity({ name: undefined })).name).toBe('Untitled activity');
    });

    it('nulls optional fields and time when they are missing', () => {
        const a = mapActivity({ id: 1 });
        expect(a.place).toBeNull();
        expect(a.location).toBeNull();
        expect(a.cost).toBeNull();
        expect(a.notes).toBeNull();
        expect(a.image).toBeNull();
        expect(a.paidAt).toBeNull();
        expect(a.paidByUserId).toBeNull();
        expect(a.kind).toBeNull();
        // No time -> midnight on the day date (length 10 -> T00:00:00).
        expect(a.startTime).toBe('2026-03-01T00:00:00');
        expect(a.endTime).toBe('2026-03-01T00:00:00');
    });

    it('drops a non-UUID paidBy id', () => {
        expect(mapActivity(makeActivity({ paidBy: { id: 'local-5', name: 'x' } })).paidByUserId).toBeNull();
    });

    it('leaves times null when the day date is empty', () => {
        const out = tripStateToSaveInput(
            singleTrip({
                destinations: [
                    makeDest({
                        itinerary: [makeDay({ date: '', activities: [makeActivity({ startTime: '09:00' })] })],
                    }),
                ],
            }),
            opts()
        );
        expect(out.days[0].activities[0].startTime).toBeNull();
    });

    it('passes a non-HH:mm time through as-is (with seconds)', () => {
        expect(mapActivity(makeActivity({ startTime: '10:30:45' })).startTime).toBe('2026-03-01T10:30:45');
    });

    describe('status resolution', () => {
        it('keeps a UUID status id directly', () => {
            expect(mapActivity(makeActivity({ status: { id: U3, name: 'Confirmed' } })).tripStatusId).toBe(U3);
        });

        it('resolves a stale numeric id by name via the lookup', () => {
            const lookup = new Map([[TRIP_STATUS.CONFIRMED, STATUS_UUID]]);
            const a = mapActivity(
                makeActivity({ status: { id: 0, name: TRIP_STATUS.CONFIRMED } }),
                { activityStatusLookup: lookup }
            );
            expect(a.tripStatusId).toBe(STATUS_UUID);
        });

        it('is null for a stale numeric id with no lookup', () => {
            expect(mapActivity(makeActivity({ status: { id: 0, name: 'Confirmed' } })).tripStatusId).toBeNull();
        });

        it('is null when the lookup has no entry for the name', () => {
            const lookup = new Map([[TRIP_STATUS.CONFIRMED, STATUS_UUID]]);
            const a = mapActivity(
                makeActivity({ status: { id: 0, name: 'Nonexistent' } }),
                { activityStatusLookup: lookup }
            );
            expect(a.tripStatusId).toBeNull();
        });

        it('is null for a plain numeric status (not an object)', () => {
            expect(mapActivity(makeActivity({ status: 5 })).tripStatusId).toBeNull();
        });

        it('is null when there is no status', () => {
            expect(mapActivity(makeActivity({ status: undefined })).tripStatusId).toBeNull();
        });
    });

    describe('budget', () => {
        it('sums the denormalized budget and forwards per-friend rows', () => {
            const a = mapActivity(
                makeActivity({
                    budget: [
                        { id: 1, user: friend(1, U1), budget: '10' },
                        { id: 2, user: friend(2, U2), budget: 20 },
                    ],
                })
            );
            expect(a.budget).toBe(30);
            expect(a.budgets).toEqual([
                { userId: U1, amount: 10 },
                { userId: U2, amount: 20 },
            ]);
        });

        it('drops rows without a user id or with a non-positive amount', () => {
            const a = mapActivity(
                makeActivity({
                    budget: [
                        { id: 1, user: friend(1), budget: '10' }, // no userId
                        { id: 2, user: friend(2, U2), budget: 0 }, // amount 0
                        { id: 3, user: friend(3, U3), budget: 15 },
                    ],
                })
            );
            // sumBudget totals every row's amount (10 + 0 + 15).
            expect(a.budget).toBe(25);
            expect(a.budgets).toEqual([{ userId: U3, amount: 15 }]);
        });

        it('nulls the summed budget when there are no positive amounts', () => {
            const a = mapActivity(makeActivity({ budget: [{ id: 1, user: friend(1, U1), budget: 0 }] }));
            expect(a.budget).toBeNull();
            expect(a.budgets).toEqual([]);
        });

        it('nulls the budget and returns empty rows when absent', () => {
            const a = mapActivity(makeActivity({ budget: undefined }));
            expect(a.budget).toBeNull();
            expect(a.budgets).toEqual([]);
        });
    });

    describe('transport', () => {
        it('maps flight segments to a flight transport', () => {
            const a = mapActivity(
                makeActivity({
                    kind: ACTIVITY_KIND.FLIGHT,
                    flightSegments: [
                        {
                            departDate: '2026-03-01',
                            departTime: '08:00',
                            arrivalDate: '2026-03-01',
                            arrivalTime: '10:00',
                            departAirport: 'JFK',
                            arrivalAirport: 'LAX',
                            flightNumber: 'AA1',
                            carrier: 'AA',
                            seatOrClass: '12A',
                        },
                    ],
                })
            );
            expect(a.transport).toEqual({
                mode: 'flight',
                legs: [
                    {
                        departAt: '2026-03-01T08:00:00',
                        arriveAt: '2026-03-01T10:00:00',
                        departPoint: 'JFK',
                        arrivePoint: 'LAX',
                        number: 'AA1',
                        carrier: 'AA',
                        seatOrClass: '12A',
                    },
                ],
            });
        });

        it('maps transit segments using the activity kind as the mode', () => {
            const a = mapActivity(
                makeActivity({
                    kind: ACTIVITY_KIND.TRAIN,
                    transitSegments: [
                        {
                            departStation: 'Gare',
                            arrivalStation: 'Lyon',
                            departDate: '2026-03-01',
                            departTime: '09:00',
                            arrivalDate: '2026-03-01',
                            arrivalTime: '11:00',
                            number: 'TGV1',
                            operator: 'SNCF',
                            classOrSeat: '1st',
                        },
                    ],
                })
            );
            expect(a.transport).toEqual({
                mode: ACTIVITY_KIND.TRAIN,
                legs: [
                    {
                        departAt: '2026-03-01T09:00:00',
                        arriveAt: '2026-03-01T11:00:00',
                        departPoint: 'Gare',
                        arrivePoint: 'Lyon',
                        number: 'TGV1',
                        carrier: 'SNCF',
                        seatOrClass: '1st',
                    },
                ],
            });
        });

        it('defaults transit mode to "train" when the kind is absent', () => {
            const a = mapActivity(
                makeActivity({ transitSegments: [{ departStation: 'A', arrivalStation: 'B' }] })
            );
            expect(a.transport?.mode).toBe('train');
            expect(a.transport?.legs[0]).toMatchObject({ departPoint: 'A', arrivePoint: 'B', departAt: null });
        });

        it('is null for a non-transport activity', () => {
            expect(mapActivity(makeActivity({ kind: ACTIVITY_KIND.PLACE })).transport).toBeNull();
        });
    });
});

describe('tripStateToSaveInput — root transport (single trip)', () => {
    const mapTransport = (flightInfo: FlightInfo | undefined, startDate = '2026-03-01') =>
        tripStateToSaveInput(
            singleTrip({ startDate, destinations: [makeDest({ flightInfo })] }),
            opts()
        ).transport;

    it('is null when there is no flight info', () => {
        expect(mapTransport(undefined)).toBeNull();
    });

    it('maps multi-segment flight info, headline mirrors leg 0, filters budgets', () => {
        const transport = mapTransport({
            mode: 'train',
            cost: '500',
            paidBy: { id: U1, name: 'Ann' },
            paidAt: '2026-02-01',
            budgets: [
                { id: 1, user: friend(1, U1), budget: '250' },
                { id: 2, user: friend(2, 'local'), budget: '100' }, // non-UUID -> dropped
                { id: 3, user: friend(3, U2), budget: 'nan' }, // amount null -> dropped
            ],
            segments: [
                {
                    departAirport: 'JFK',
                    arrivalAirport: 'LAX',
                    departDate: '2026-03-01',
                    departTime: '08:00',
                    arrivalDate: '2026-03-01',
                    arrivalTime: '11:00',
                    flightNumber: 'AA1',
                    carrier: 'AA',
                    seatOrClass: '2A',
                },
                {
                    departAirport: 'LAX',
                    arrivalAirport: 'SFO',
                    departDate: '2026-03-01',
                    departTime: '12:00',
                    arrivalDate: '2026-03-01',
                    arrivalTime: '13:00',
                    flightNumber: 'AA2',
                    carrier: 'AA',
                },
            ],
        });
        expect(transport).not.toBeNull();
        expect(transport?.mode).toBe('train');
        expect(transport?.legs).toHaveLength(2);
        expect(transport?.departPoint).toBe('JFK');
        expect(transport?.arrivePoint).toBe('LAX');
        expect(transport?.departAt).toBe('2026-03-01T08:00:00');
        expect(transport?.arriveAt).toBe('2026-03-01T11:00:00');
        expect(transport?.number).toBe('AA1');
        expect(transport?.carrier).toBe('AA');
        expect(transport?.cost).toBe(500);
        expect(transport?.paidByUserId).toBe(U1);
        expect(transport?.paidAt).toBe('2026-02-01');
        expect(transport?.budgets).toEqual([{ userId: U1, amount: 250 }]);
    });

    it('synthesizes a single leg from flat fields and defaults mode to flight', () => {
        const transport = mapTransport({
            departAirport: 'BOS',
            arrivalAirport: 'JFK',
            departTime: '07:00', // no departDate -> falls back to the defaultDate (trip start)
            arrivalDate: '2026-03-01',
            arrivalTime: '08:00',
            flightNumber: 'B1',
            carrier: 'DL',
        });
        expect(transport?.mode).toBe('flight');
        expect(transport?.legs).toHaveLength(1);
        expect(transport?.departPoint).toBe('BOS');
        expect(transport?.departAt).toBe('2026-03-01T07:00:00'); // defaultDate used
        expect(transport?.cost).toBeNull();
        expect(transport?.paidByUserId).toBeNull();
        expect(transport?.paidAt).toBeNull();
        expect(transport?.budgets).toEqual([]);
    });

    it('drops a non-UUID payer id', () => {
        const transport = mapTransport({ paidBy: { id: 'friend-7', name: 'x' } });
        expect(transport?.paidByUserId).toBeNull();
    });

    it('leaves a full-datetime depart point untouched when it is not 10 chars and has no time', () => {
        const transport = mapTransport({
            segments: [{ departAirport: 'X', departDate: '2026-3-1' }],
        });
        expect(transport?.departAt).toBe('2026-3-1');
    });
});

describe('tripStateToSaveInput — multi-destination', () => {
    it('builds date-range destinations, root country/transport/days go empty', () => {
        const trip = multiTrip({
            name: 'Euro Trip',
            startDate: '2026-04-01',
            endDate: '2026-04-10',
            destinations: [
                makeDest({
                    id: 1,
                    country: { id: U1, name: 'France' },
                    flightInfo: { segments: [{ departAirport: 'CDG', departDate: '2026-04-01' }] },
                    startDate: '2026-04-01',
                    endDate: '2026-04-04',
                    note: 'first leg',
                    itinerary: [makeDay({ date: '2026-04-01', activities: [makeActivity({ name: 'Eiffel' })] })],
                }),
                makeDest({
                    id: 2,
                    country: { id: 0, name: 'Italy' }, // no UUID -> countryId ''
                    startDate: '2026-04-05',
                    itinerary: [makeDay({ id: 2, date: '2026-04-05', activities: [] })],
                }),
            ],
        });
        const out = tripStateToSaveInput(trip, opts({ interaryTypeId: 'multi-type-uuid' }));

        expect(out.countryId).toBeNull();
        expect(out.transport).toBeNull();
        expect(out.days).toEqual([]);
        expect(out.destinations).toHaveLength(2);

        const [d1, d2] = out.destinations!;
        expect(d1.countryId).toBe(U1);
        expect(d1.startDate).toBe('2026-04-01');
        // endDate derived: day before the next destination's start.
        expect(d1.endDate).toBe('2026-04-04');
        expect(d1.note).toBe('first leg');
        expect(d1.order).toBe(0);
        expect(d1.transport).not.toBeNull();
        expect(d1.days).toHaveLength(1);
        expect(d1.days[0].countryId).toBeNull();
        expect(d1.days[0].transport).toBeNull();
        expect(d1.days[0].activities[0].name).toBe('Eiffel');

        expect(d2.countryId).toBe(''); // placeholder country dropped to empty
        expect(d2.startDate).toBe('2026-04-05');
        // last destination -> ends at the trip end.
        expect(d2.endDate).toBe('2026-04-10');
        expect(d2.note).toBeNull();
        expect(d2.order).toBe(1);
        expect(d2.transport).toBeNull();
    });

    it('derives start/end from the destination days when the destination has no boundary dates', () => {
        const trip = multiTrip({
            startDate: '2026-04-01',
            destinations: [
                makeDest({
                    id: 1,
                    startDate: undefined,
                    endDate: undefined,
                    itinerary: [
                        makeDay({ id: 1, date: '2026-04-05', activities: [] }),
                        makeDay({ id: 2, date: '2026-04-07', activities: [] }),
                    ],
                }),
            ],
        });
        const [d] = tripStateToSaveInput(trip, opts())!.destinations!;
        expect(d.startDate).toBe('2026-04-05');
        expect(d.endDate).toBe('2026-04-07');
    });

    it('falls back to empty start/end when a destination has no dates and no days', () => {
        const trip = multiTrip({
            destinations: [makeDest({ startDate: undefined, endDate: undefined, itinerary: [] })],
        });
        const [d] = tripStateToSaveInput(trip, opts())!.destinations!;
        expect(d.startDate).toBe('');
        expect(d.endDate).toBe('');
    });

    it('falls back to the trip start date for a dateless, dayless destination', () => {
        const trip = multiTrip({
            startDate: '2026-04-01',
            destinations: [makeDest({ startDate: undefined, endDate: undefined, itinerary: [] })],
        });
        const [d] = tripStateToSaveInput(trip, opts())!.destinations!;
        expect(d.startDate).toBe('2026-04-01');
        expect(d.endDate).toBe('2026-04-01');
    });

    it('produces an empty destinations list for a multi trip with none', () => {
        const out = tripStateToSaveInput(multiTrip({ destinations: [] }), opts());
        expect(out.destinations).toEqual([]);
    });
});

describe('resolveInteraryTypeId', () => {
    const types = [
        { id: 'single-id', name: ITINERARY_TYPE.SINGLE },
        { id: 'multi-id', name: ITINERARY_TYPE.MULTI },
    ];

    it('resolves the single-destination type id', () => {
        expect(resolveInteraryTypeId({ destinations: [] }, types)).toBe('single-id');
    });

    it('resolves the multi-destination type id', () => {
        expect(
            resolveInteraryTypeId({ destinations: [], type: { ...TRIP_BASIC.MULTIPLE } }, types)
        ).toBe('multi-id');
    });

    it('returns null when the wanted type is not in the list', () => {
        expect(resolveInteraryTypeId({ destinations: [] }, [])).toBeNull();
    });
});
