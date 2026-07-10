import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { TRIP_BASIC, ACTIVITY_KIND } from 'constants';
import type { Country, Destination, TripState } from 'types';

vi.mock('api/pythonGqlClient', () => ({
    pythonGqlClient: { request: vi.fn() },
}));

import { pythonGqlClient } from 'api/pythonGqlClient';
import {
    placeToActivity,
    lookupCountry,
    dispatchStartFreshTrip,
    addPlaceToTripState,
    findMatchingDestinationIndex,
    type AddablePlace,
} from './addPlaceToItinerary';

const requestMock = pythonGqlClient.request as unknown as Mock;

const FRANCE: Country = { id: 1, name: 'France', code: 'FR', image: 'fr.jpg' };

const place = (overrides: Partial<AddablePlace> = {}): AddablePlace => ({
    name: 'Eiffel Tower',
    city: 'Paris',
    country: 'France',
    description: 'Iconic tower',
    imageUrl: 'eiffel.jpg',
    ...overrides,
});

describe('placeToActivity', () => {
    it('maps a place with an image into an activity draft', () => {
        expect(placeToActivity(place())).toEqual({
            name: 'Eiffel Tower',
            location: 'Paris, France',
            note: 'Iconic tower',
            image: { url: 'eiffel.jpg', name: 'Eiffel Tower' },
        });
    });

    it('omits the image key when the place has no imageUrl', () => {
        const activity = placeToActivity(
            place({ imageUrl: undefined, description: undefined }),
        );
        expect(activity).not.toHaveProperty('image');
        expect(activity.note).toBeUndefined();
        expect(activity.location).toBe('Paris, France');
    });
});

describe('lookupCountry', () => {
    beforeEach(() => {
        requestMock.mockReset();
    });

    it('prefers a case-insensitive exact name match', async () => {
        requestMock.mockResolvedValue({
            countries: [
                { id: '9', name: 'Japanic', code: 'XX', local: null, image: null },
                { id: '2', name: 'Japan', code: 'JP', local: '日本', image: 'j.jpg' },
            ],
        });
        expect(await lookupCountry('japan')).toEqual({
            id: '2',
            name: 'Japan',
            code: 'JP',
            local: '日本',
            image: 'j.jpg',
        });
    });

    it('falls back to the first result and nulls become undefined', async () => {
        requestMock.mockResolvedValue({
            countries: [
                { id: '1', name: 'Germany', code: 'DE', local: null, image: null },
            ],
        });
        expect(await lookupCountry('xyz')).toEqual({
            id: '1',
            name: 'Germany',
            code: 'DE',
            local: undefined,
            image: undefined,
        });
    });

    it('returns null when the catalog has no matches', async () => {
        requestMock.mockResolvedValue({ countries: [] });
        expect(await lookupCountry('nowhere')).toBeNull();
    });
});

describe('dispatchStartFreshTrip', () => {
    it('resets, seeds basics, and adds the place (no airports)', () => {
        const dispatch = vi.fn();
        dispatchStartFreshTrip(place(), FRANCE, dispatch);

        expect(dispatch).toHaveBeenCalledTimes(3);
        expect(dispatch.mock.calls[0][0]).toEqual({ type: 'resetTrip' });

        const basics = dispatch.mock.calls[1][0];
        expect(basics.type).toBe('basicInfo');
        expect(basics.payload.type).toBe(TRIP_BASIC.SINGLE);
        expect(basics.payload.name).toBe('Trip to France');
        expect(basics.payload.image).toBe('eiffel.jpg');
        expect(basics.payload.startDate).toBe(basics.payload.endDate);
        expect(basics.payload.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(basics.payload.destinations[0].country).toEqual(FRANCE);
        expect(basics.payload.destinations[0].flightInfo).toBeUndefined();

        const addPlaceAction = dispatch.mock.calls[2][0];
        expect(addPlaceAction.type).toBe('addPlace');
        expect(addPlaceAction.payload.index).toBe(0);
        expect(addPlaceAction.payload.destinationIndx).toBe(0);
        expect(addPlaceAction.payload.value.name).toBe('Eiffel Tower');
    });

    it('seeds a Day-1 outbound flight when airports are known', () => {
        const dispatch = vi.fn();
        dispatchStartFreshTrip(place(), FRANCE, dispatch, {
            departAirportCode: 'JFK',
            arrivalAirportCode: 'CDG',
        });

        expect(dispatch).toHaveBeenCalledTimes(4);
        const basics = dispatch.mock.calls[1][0];
        expect(basics.payload.destinations[0].flightInfo).toEqual({
            arrivalAirport: 'CDG',
        });

        const flight = dispatch.mock.calls[2][0];
        expect(flight.type).toBe('addPlace');
        expect(flight.payload.value.kind).toBe(ACTIVITY_KIND.FLIGHT);
        expect(flight.payload.value.flightSegments[0]).toMatchObject({
            departAirport: 'JFK',
            arrivalAirport: 'CDG',
        });

        // the place is still added last
        expect(dispatch.mock.calls[3][0].payload.value.name).toBe('Eiffel Tower');
    });

    it('falls back to the country image, then undefined, for the trip image', () => {
        const withCountryImg = vi.fn();
        dispatchStartFreshTrip(place({ imageUrl: undefined }), FRANCE, withCountryImg);
        expect(withCountryImg.mock.calls[1][0].payload.image).toBe('fr.jpg');

        const noImg = vi.fn();
        dispatchStartFreshTrip(
            place({ imageUrl: undefined }),
            { ...FRANCE, image: undefined },
            noImg,
        );
        expect(noImg.mock.calls[1][0].payload.image).toBeUndefined();
    });
});

describe('addPlaceToTripState', () => {
    const dest = (overrides: Partial<Destination> = {}): Destination =>
        ({
            id: 10,
            country: { id: 1, name: 'France', code: 'FR' },
            itinerary: [],
            ...overrides,
        }) as Destination;

    const trip = (overrides: Partial<TripState> = {}): TripState => ({
        destinations: [],
        ...overrides,
    });

    it('appends to the earliest existing day of a matching destination', () => {
        const existing = trip({
            type: TRIP_BASIC.MULTIPLE,
            destinations: [
                dest({
                    itinerary: [
                        { id: 1, date: '2026-05-10', activities: [{ id: 99, name: 'Old' }] },
                    ],
                }),
            ],
        });

        const out = addPlaceToTripState(existing, place(), FRANCE, 0);

        const day = out.destinations[0].itinerary[0];
        expect(day.activities).toHaveLength(2);
        expect(day.activities[1].name).toBe('Eiffel Tower');
        expect(typeof day.activities[1].id).toBe('number');
        // original is untouched (immer)
        expect(existing.destinations[0].itinerary[0].activities).toHaveLength(1);
    });

    it('creates a new day on a matching destination that has no days', () => {
        const existing = trip({
            destinations: [dest({ startDate: '2026-06-01', itinerary: [] })],
        });

        const out = addPlaceToTripState(existing, place(), FRANCE, 0);

        expect(out.destinations[0].itinerary).toHaveLength(1);
        expect(out.destinations[0].itinerary[0].date).toBe('2026-06-01');
        expect(out.destinations[0].itinerary[0].activities[0].name).toBe(
            'Eiffel Tower',
        );
    });

    it('initialises a missing itinerary array on a matching destination', () => {
        const bareDest = {
            id: 10,
            country: { id: 1, name: 'France', code: 'FR' },
            startDate: '2026-06-02',
        } as unknown as Destination;
        const existing = trip({ destinations: [bareDest] });

        const out = addPlaceToTripState(existing, place(), FRANCE, 0);

        expect(out.destinations[0].itinerary).toHaveLength(1);
        expect(out.destinations[0].itinerary[0].date).toBe('2026-06-02');
    });

    it('returns the trip unchanged when the matching index is out of range', () => {
        const existing = trip({ destinations: [dest()] });
        const out = addPlaceToTripState(existing, place(), FRANCE, 5);
        expect(out).toEqual(existing);
    });

    it('adds a new destination and promotes single→multi when no match', () => {
        const existing = trip({
            type: TRIP_BASIC.SINGLE,
            startDate: '2026-07-01',
            endDate: '2026-07-05',
            destinations: [dest()],
        });

        const out = addPlaceToTripState(existing, place(), FRANCE, -1);

        expect(out.type).toBe(TRIP_BASIC.MULTIPLE);
        expect(out.destinations).toHaveLength(2);
        const added = out.destinations[1];
        expect(added.country).toEqual(FRANCE);
        expect(added.startDate).toBe('2026-07-01');
        expect(added.itinerary[0].date).toBe('2026-07-01');
        expect(added.itinerary[0].activities[0].name).toBe('Eiffel Tower');
    });

    it('keeps a multi trip as multi and dates default to today when absent', () => {
        const existing = trip({
            type: TRIP_BASIC.MULTIPLE,
            destinations: [dest()],
        });

        const out = addPlaceToTripState(existing, place(), FRANCE, -1);

        expect(out.type).toBe(TRIP_BASIC.MULTIPLE);
        expect(out.destinations).toHaveLength(2);
        expect(out.destinations[1].itinerary[0].date).toMatch(
            /^\d{4}-\d{2}-\d{2}$/,
        );
    });
});

describe('findMatchingDestinationIndex', () => {
    const trip = (destinations: unknown): TripState =>
        ({ destinations }) as TripState;

    it('finds a country by case-insensitive name', () => {
        const t = trip([
            { country: { name: 'Japan' } },
            { country: { name: 'France' } },
        ]);
        expect(findMatchingDestinationIndex(t, 'france')).toBe(1);
        expect(findMatchingDestinationIndex(t, 'JAPAN')).toBe(0);
    });

    it('returns -1 when no destination matches', () => {
        const t = trip([{ country: { name: 'Japan' } }]);
        expect(findMatchingDestinationIndex(t, 'Peru')).toBe(-1);
    });

    it('skips destinations with no country / name', () => {
        const t = trip([{ country: undefined }, { country: { name: 'Peru' } }]);
        expect(findMatchingDestinationIndex(t, 'peru')).toBe(1);
    });

    it('returns -1 when destinations is absent', () => {
        expect(findMatchingDestinationIndex(trip(undefined), 'france')).toBe(-1);
    });
});
