/**
 * Shared trip-mutation helpers used by `AddToItineraryButton` and by
 * `PlacesYouMightLove` card clicks.
 *
 * Why extracted: both surfaces need identical "start fresh / add to
 * current" semantics — including saving the place's image at both the
 * trip level (for the trip-card thumbnail) and the activity level (for
 * the place row inside the itinerary). Centralizing the logic prevents
 * the two callers from drifting.
 */
import { gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';
import {
    addDestination,
    addPlace,
    basicInfo,
    resetTrip,
    type TripAction,
} from 'context/TripContext';
import { TRIP_BASIC } from 'constants';
import { now } from 'utils';
import type {
    Activity,
    Country,
    Destination,
    TripState,
} from 'types';

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

/** Append `place` to an in-progress trip. If the trip already has a
 *  destination in the same country, the place is added to that
 *  destination's earliest day; otherwise a new destination is appended
 *  (promoting a single-destination trip to multi when needed). */
export const dispatchAddToCurrentTrip = (
    place: AddablePlace,
    country: Country,
    trip: TripState,
    matchingDestinationIndex: number,
    dispatch: (action: TripAction) => void
): { route: string } => {
    const isMultiTrip = trip.type?.id === TRIP_BASIC.MULTIPLE.id;

    if (matchingDestinationIndex !== -1) {
        const dest = trip.destinations[matchingDestinationIndex];
        const date = earliestDateOf(dest, trip.startDate);
        dispatch(
            addPlace({
                value: placeToActivity(place),
                index: 0,
                date,
                destinationIndx: matchingDestinationIndex,
            })
        );
        return { route: trip.type?.route ?? TRIP_BASIC.SINGLE.route };
    }

    // No matching destination — append a new one. Promote single→multi
    // first so the type reflects reality.
    if (!isMultiTrip) {
        dispatch(basicInfo({ type: TRIP_BASIC.MULTIPLE }));
    }
    const newDestinationIndex = trip.destinations.length;
    dispatch(
        addDestination({
            value: { country },
            startDate: trip.startDate,
            endDate: trip.endDate,
        })
    );
    dispatch(
        addPlace({
            value: placeToActivity(place),
            index: 0,
            date: trip.startDate ?? now(),
            destinationIndx: newDestinationIndex,
        })
    );
    return { route: TRIP_BASIC.MULTIPLE.route };
};

/** True when the trip draft has been touched (destinations or type
 *  set). Use to decide between "start fresh" vs. "ask the user". */
export const tripHasContent = (trip: TripState): boolean =>
    (trip.destinations?.length ?? 0) > 0 || Boolean(trip.type);

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
