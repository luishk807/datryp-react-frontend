/**
 * Bridge between the API's `ApiItinerary` shape and the legacy frontend
 * types (`SingleDestination` / `MultipleDestinations` / `TripState`) that
 * the existing UI components were built against.
 *
 * Keeps the rest of the UI working without rewriting every component.
 */

import { addDays, formatDate, isValidDate } from 'utils';
import type { ApiActivity, ApiActivityBudget, ApiItinerary } from 'api/hooks/useItineraries';
import { ITINERARY_TYPE, TRIP_BASIC, TRIP_STATUS } from 'constants';
import type {
    Activity,
    ActivityKind,
    BudgetItem,
    Destination,
    FlightInfo,
    Friend,
    MultipleDestinations,
    SingleDestination,
    TripState,
} from 'types';
import { ACTIVITY_KIND } from 'constants';

/** Cheap stable hash so UUID strings can still be used where a numeric id is expected. */
const uuidToNumericId = (uuid: string): number => {
    let h = 0;
    for (let i = 0; i < uuid.length; i++) {
        h = (h * 31 + uuid.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
};

/** Extract `HH:mm` from a backend datetime string ("2026-05-14T12:00:00" → "12:00").
 * The frontend Activity type stores times as `HH:mm` (paired with the day's
 * `date`); tripMapper recombines them on save. If we pass the full ISO back
 * through tripMapper, `combineDateTime` would double-prepend the date.
 */
const apiTimeToHHmm = (iso: string | null | undefined): string | undefined => {
    if (!iso) return undefined;
    return isValidDate(iso) ? formatDate(iso, 'HH:mm') : undefined;
};

/** Convert backend `ActivityBudgetEntry[]` to the frontend `BudgetItem[]`
 * shape that AddBudget / Activities expect. We preserve `userId` so future
 * round-trips can match the breakdown back to the same user.
 */
const apiBudgetsToItems = (
    entries: ApiActivityBudget[] | null | undefined
): BudgetItem[] | undefined => {
    if (!entries || !entries.length) return undefined;
    return entries.map((b) => ({
        id: uuidToNumericId(b.id),
        user: {
            id: uuidToNumericId(b.user.id),
            label: b.user.name ?? b.user.email,
            name: b.user.name ?? b.user.email,
            userId: b.user.id,
        },
        budget: b.amount,
    }));
};

/** Split a backend combined ISO datetime back into the form FlightInfo
 *  expects on the frontend (date = YYYY-MM-DD, time = HH:mm). The form
 *  fields are split and tripMapper recombines them on save — passing the
 *  full ISO back through would double-prepend the date. */
const splitDateTime = (
    iso: string | null | undefined
): { date?: string; time?: string } => {
    if (!iso || !isValidDate(iso)) return {};
    return {
        date: formatDate(iso, 'YYYY-MM-DD'),
        time: formatDate(iso, 'HH:mm'),
    };
};

const apiFlightSegmentToFlightInfo = (s: {
    departDate: string | null;
    arrivalDate: string | null;
    flightNumber: string | null;
    departAirport: string | null;
    arrivalAirport: string | null;
}): FlightInfo => {
    const dep = splitDateTime(s.departDate);
    const arr = splitDateTime(s.arrivalDate);
    return {
        departDate: dep.date,
        departTime: dep.time,
        arrivalDate: arr.date,
        arrivalTime: arr.time,
        flightNumber: s.flightNumber ?? undefined,
        departAirport: s.departAirport ?? undefined,
        arrivalAirport: s.arrivalAirport ?? undefined,
    };
};

const normalizeKind = (k: string | null | undefined): ActivityKind | undefined => {
    if (k === ACTIVITY_KIND.FLIGHT) return ACTIVITY_KIND.FLIGHT;
    if (k === ACTIVITY_KIND.NOTE) return ACTIVITY_KIND.NOTE;
    if (k === ACTIVITY_KIND.PLACE) return ACTIVITY_KIND.PLACE;
    return undefined;
};

/** Single source of truth for ApiActivity → Activity mapping. Used by both
 *  `apiToTripEntry` and `apiToTripState`, and in single + multi branches.
 *  `status` is preserved as `{id (UUID), name}` so the status toggle on the
 *  card and `activityToInput` on save both have the real backend identifier. */
const apiActivityToActivity = (a: ApiActivity): Activity => ({
    id: uuidToNumericId(a.id),
    kind: normalizeKind(a.kind),
    name: a.name,
    place: a.place ?? undefined,
    location: a.location ?? undefined,
    startTime: apiTimeToHHmm(a.startTime),
    endTime: apiTimeToHHmm(a.endTime),
    cost: a.cost ?? undefined,
    note: a.notes ?? undefined,
    // Backend persists `image` as a plain URL string; rehydrate into the
    // `ImageRef` shape the UI expects ({ url, name }) so saved AI-suggested
    // photos survive a reload. Without this, the activity card lost its
    // image after the trip was saved.
    image: a.image ? { url: a.image, name: a.name } : undefined,
    status: a.status ? { id: a.status.id, name: a.status.name } : undefined,
    budget: apiBudgetsToItems(a.budgets),
    flightSegments: a.flightSegments?.length
        ? a.flightSegments.map(apiFlightSegmentToFlightInfo)
        : undefined,
});

const apiUserToFriend = (u: { id: string; name: string | null; email: string }): Friend => ({
    id: uuidToNumericId(u.id),
    label: u.name ?? u.email,
    name: u.name ?? u.email,
    userId: u.id,
});

const apiUserToLegacyUser = (u: {
    id: string;
    name: string | null;
    email: string;
}) =>
    ({
        id: uuidToNumericId(u.id),
        name: u.name ?? u.email,
        email: u.email,
        userId: u.id,
        // Fields demanded by the legacy User type but irrelevant to the UI:
        phone: '',
        dob: '',
        countryOfBirth: { id: 0, name: '' },
        gender: { id: 0, name: '' },
    }) as unknown as Friend; // shape mismatch is intentional — see file header

export const apiIsSingleTrip = (it: ApiItinerary): boolean =>
    it.interaryType.name === ITINERARY_TYPE.SINGLE;

/** ApiItinerary → SingleDestination | MultipleDestinations (for TripBox / TripDetail). */
export const apiToTripEntry = (
    it: ApiItinerary
): SingleDestination | MultipleDestinations => {
    const isSingle = apiIsSingleTrip(it);

    const shared = {
        id: uuidToNumericId(it.id),
        apiId: it.id, // preserved for UUID-aware lookups
        name: it.name ?? 'Untitled trip',
        startDate: it.startDate ?? '',
        endDate: it.endDate ?? '',
        status: it.status
            ? { id: it.status.id, name: it.status.name }
            : { id: 1, name: TRIP_STATUS.PLANNING },
        user: apiUserToLegacyUser(it.user) as unknown as SingleDestination['user'],
        budget: it.budget ?? 0,
        image: it.image ?? undefined,
        friends: it.friends.map(
            apiUserToLegacyUser
        ) as unknown as SingleDestination['friends'],
        organizers: it.organizers.map(
            apiUserToLegacyUser
        ) as unknown as SingleDestination['organizers'],
        interaryType: it.interaryType,
    };

    if (isSingle) {
        return {
            ...shared,
            country: it.country ?? { id: 0, name: '' },
            flightInfo: it.flightInfo ?? {},
            intenaryDates: it.intenaryDates.map((d) => ({
                id: uuidToNumericId(d.id),
                date: d.date,
                activities: d.activities.map(apiActivityToActivity),
            })),
        } as unknown as SingleDestination & { apiId: string };
    }

    return {
        ...shared,
        intenaryDates: it.intenaryDates.map((d) => ({
            id: uuidToNumericId(d.id),
            date: d.date,
            country: d.country ?? { id: 0, name: '' },
            flightInfo: d.flightInfo ?? {},
            activities: d.activities.map(apiActivityToActivity),
        })),
    } as unknown as MultipleDestinations & { apiId: string };
};

/** ApiItinerary → TripState (for the in-progress trip editor flow). */
export const apiToTripState = (it: ApiItinerary): TripState => {
    const isSingle = apiIsSingleTrip(it);
    const friends: Friend[] = it.friends.map(apiUserToFriend);
    const organizer: Friend[] = it.organizers.map(apiUserToFriend);

    let destinations: Destination[];
    if (isSingle) {
        destinations = [
            {
                id: uuidToNumericId(it.id),
                country: it.country ?? { id: 0, name: '' },
                flightInfo: it.flightInfo ?? undefined,
                itinerary: it.intenaryDates.map((d) => ({
                    id: uuidToNumericId(d.id),
                    date: d.date,
                    activities: d.activities.map(apiActivityToActivity),
                })),
            },
        ];
    } else {
        // Group days by country to form Destination[].
        const dates = it.intenaryDates;
        destinations = dates.map((d, i) => {
            const nextDate = dates[i + 1]?.date;
            const endDate = nextDate
                ? addDays(nextDate, -1)
                : it.endDate ?? d.date;
            return {
                id: uuidToNumericId(d.id),
                country: d.country ?? { id: 0, name: '' },
                flightInfo: d.flightInfo ?? undefined,
                startDate: d.date,
                endDate,
                itinerary: [
                    {
                        id: uuidToNumericId(d.id),
                        date: d.date,
                        activities: d.activities.map(apiActivityToActivity),
                    },
                ],
            };
        });
    }

    return {
        apiId: it.id,
        name: it.name ?? '',
        startDate: it.startDate ?? undefined,
        endDate: it.endDate ?? undefined,
        status: it.status
            ? { id: it.status.id, name: it.status.name }
            : undefined,
        // Match the numeric id to TRIP_BASIC so downstream `isSingleTrip(type?.id)`
        // checks resolve correctly — DateBlock branches single vs multi rendering
        // off this id, not off `interaryType.name`.
        type: it.interaryType
            ? isSingle
                ? { ...TRIP_BASIC.SINGLE, name: it.interaryType.name }
                : { ...TRIP_BASIC.MULTIPLE, name: it.interaryType.name }
            : undefined,
        budget: it.budget ?? undefined,
        total: it.budget ?? undefined,
        image: it.image ?? undefined,
        destinations,
        organizer,
        friends,
    };
};

/** True if the current user (by backend UUID) is an organizer on the given itinerary. */
export const isCurrentUserOrganizer = (
    it: ApiItinerary | undefined,
    currentUserId: string | undefined
): boolean => {
    if (!it || !currentUserId) return false;
    if (it.user.id === currentUserId) return true;
    return it.organizers.some((o) => o.id === currentUserId);
};
