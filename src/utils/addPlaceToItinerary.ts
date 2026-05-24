/**
 * Trip-mutation helpers for the /place "Add to itinerary" surface.
 *
 * Two paths, picked by whether the page URL carries a `?id=<tripId>`:
 *
 *   1. No id  → `dispatchStartFreshTrip` wipes the local draft and
 *      seeds a fresh single-destination trip with this place. The
 *      caller drops the user on /single to finish setup.
 *
 *   2. id     → `addPlaceToTripState` is a pure function the caller
 *      uses to fold the place into a hydrated saved trip; the result
 *      goes through `tripStateToSaveInput` + `useSaveItinerary` and
 *      the user lands on /trip-detail. No draft involvement.
 */
import { gql } from 'graphql-request';
import { produce } from 'immer';
import { pythonGqlClient } from 'api/pythonGqlClient';
import {
    addPlace,
    basicInfo,
    resetTrip,
    type TripAction,
} from 'context/TripContext';
import { TRIP_BASIC } from 'constants';
import { now, isSameDay } from 'utils';
import type {
    Activity,
    Country,
    Destination,
    ItineraryDay,
    TripState,
} from 'types';

let nextLocalId = 1;
const localId = (): number => {
    if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return buf[0];
    }
    nextLocalId += 1;
    return Date.now() + nextLocalId;
};

const COUNTRY_LOOKUP_QUERY = gql`
    query AddToItineraryCountry($query: String!) {
        countries(query: $query, limit: 5) {
            id
            name
            code
            local
            image
        }
    }
`;

interface CountryLookupResult {
    countries: Array<{
        id: string;
        name: string;
        code: string;
        local: string | null;
        image: string | null;
    }>;
}

/** Minimal place shape both AddToItineraryButton and PYML cards can
 *  conform to. Wider than PlaceRecommendation so PYML's lighter
 *  `PlaceSuggestion` shape fits without a separate adapter. */
export interface AddablePlace {
    name: string;
    /** City name. PYML suggestions reuse `name` as city; that's fine. */
    city: string;
    country: string;
    description?: string;
    imageUrl?: string | null;
}

/** Resolve a country name against the canonical catalog. Returns null
 *  when the catalog has no match — caller should surface a "country not
 *  found" error rather than dispatching with a bogus FK. */
export const lookupCountry = async (name: string): Promise<Country | null> => {
    const result = await pythonGqlClient.request<CountryLookupResult>(
        COUNTRY_LOOKUP_QUERY,
        { query: name }
    );
    const exact = result.countries.find(
        (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    const match = exact ?? result.countries[0];
    if (!match) return null;
    return {
        id: match.id,
        name: match.name,
        code: match.code,
        local: match.local ?? undefined,
        image: match.image ?? undefined,
    };
};

export const placeToActivity = (
    place: AddablePlace
): Omit<Activity, 'id'> => ({
    name: place.name,
    location: `${place.city}, ${place.country}`,
    note: place.description,
    ...(place.imageUrl
        ? { image: { url: place.imageUrl, name: place.name } }
        : {}),
});

const earliestDateOf = (dest: Destination, tripStart?: string): string => {
    const dayDates = (dest.itinerary ?? [])
        .map((d) => d.date)
        .filter((d): d is string => Boolean(d));
    if (dayDates.length > 0) {
        // YYYY-MM-DD sorts lexicographically.
        return [...dayDates].sort()[0];
    }
    return dest.startDate ?? tripStart ?? now();
};

/** Wipe the current draft and seed a fresh single-destination trip
 *  centered on `place`. Both the trip-level image (for the trip card
 *  thumbnail) and the activity image (for the place row inside the
 *  itinerary) are populated when `place.imageUrl` is set — that fixes
 *  the "main image is also saved" requirement. */
export const dispatchStartFreshTrip = (
    place: AddablePlace,
    country: Country,
    dispatch: (action: TripAction) => void
): void => {
    const today = now();
    dispatch(resetTrip());
    dispatch(
        basicInfo({
            type: TRIP_BASIC.SINGLE,
            name: `Trip to ${country.name}`,
            destinations: [{ country }] as Destination[],
            startDate: today,
            endDate: today,
            // Seed the trip-level image so the /trips card has a
            // thumbnail (and the save mutation persists it to
            // `itineraries.image`). Falls back to the country catalog
            // image when the place itself didn't carry one.
            image: place.imageUrl ?? country.image ?? undefined,
        })
    );
    dispatch(
        addPlace({
            value: placeToActivity(place),
            index: 0,
            date: today,
            destinationIndx: 0,
        })
    );
};

/** Fold `place` into a `TripState` (typically one hydrated from the
 *  backend via `apiToTripState`). If a destination in the same
 *  country exists, the place is appended to that destination's
 *  earliest day; otherwise a new destination is added and the trip
 *  promotes single→multi as needed. Returns a new `TripState`; the
 *  caller is expected to send it through `tripStateToSaveInput` +
 *  `useSaveItinerary` to persist.
 */
export const addPlaceToTripState = (
    trip: TripState,
    place: AddablePlace,
    country: Country,
    matchingDestinationIndex: number
): TripState =>
    produce(trip, (draft) => {
        const isMultiTrip = draft.type?.id === TRIP_BASIC.MULTIPLE.id;
        const activity: Activity = {
            ...placeToActivity(place),
            id: localId(),
        };

        if (matchingDestinationIndex !== -1) {
            const dest = draft.destinations[matchingDestinationIndex];
            if (!dest) return;
            if (!dest.itinerary) dest.itinerary = [];
            const date = earliestDateOf(dest, draft.startDate);
            const day = dest.itinerary.find((d) => isSameDay(d.date, date));
            if (day) {
                day.activities.push(activity);
            } else {
                dest.itinerary.push({
                    id: localId(),
                    date,
                    activities: [activity],
                });
            }
            return;
        }

        if (!isMultiTrip) {
            draft.type = TRIP_BASIC.MULTIPLE;
        }
        const date = draft.startDate ?? now();
        const newDay: ItineraryDay = {
            id: localId(),
            date,
            activities: [activity],
        };
        draft.destinations.push({
            id: localId(),
            country,
            startDate: draft.startDate,
            endDate: draft.endDate,
            itinerary: [newDay],
        } as Destination);
    });

/** Find the index of a destination matching `countryName` (case-
 *  insensitive). Returns -1 when no match exists. */
export const findMatchingDestinationIndex = (
    trip: TripState,
    countryName: string
): number => {
    const target = countryName.toLowerCase();
    return (
        trip.destinations?.findIndex(
            (d) => d.country?.name?.toLowerCase() === target
        ) ?? -1
    );
};
