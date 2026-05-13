/**
 * Bridge between the API's `ApiItinerary` shape and the legacy frontend
 * types (`SingleDestination` / `MultipleDestinations` / `TripState`) that
 * the existing UI components were built against.
 *
 * Keeps the rest of the UI working without rewriting every component.
 */

import moment from 'moment';
import type { ApiItinerary } from 'api/hooks/useItineraries';
import type {
    Destination,
    Friend,
    MultipleDestinations,
    SingleDestination,
    TripState,
} from 'types';

const SINGLE_TRIP_TYPE_NAME = 'Single Destination Trip';

/** Cheap stable hash so UUID strings can still be used where a numeric id is expected. */
const uuidToNumericId = (uuid: string): number => {
    let h = 0;
    for (let i = 0; i < uuid.length; i++) {
        h = (h * 31 + uuid.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
};

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
    it.interaryType.name === SINGLE_TRIP_TYPE_NAME;

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
            : { id: 1, name: 'Planning' },
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
                activities: d.activities.map((a) => ({
                    id: uuidToNumericId(a.id),
                    name: a.name,
                    place: a.place ?? undefined,
                    location: a.location ?? undefined,
                    startTime: a.startTime ?? undefined,
                    endTime: a.endTime ?? undefined,
                    cost: a.cost ?? undefined,
                    note: a.notes ?? undefined,
                })),
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
            activities: d.activities.map((a) => ({
                id: uuidToNumericId(a.id),
                name: a.name,
                place: a.place ?? undefined,
                location: a.location ?? undefined,
                startTime: a.startTime ?? undefined,
                endTime: a.endTime ?? undefined,
                cost: a.cost ?? undefined,
                note: a.notes ?? undefined,
            })),
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
                    activities: d.activities.map((a) => ({
                        id: uuidToNumericId(a.id),
                        name: a.name,
                        place: a.place ?? undefined,
                        location: a.location ?? undefined,
                        startTime: a.startTime ?? undefined,
                        endTime: a.endTime ?? undefined,
                        cost: a.cost ?? undefined,
                        note: a.notes ?? undefined,
                    })),
                })),
            },
        ];
    } else {
        // Group days by country to form Destination[].
        const dates = it.intenaryDates;
        destinations = dates.map((d, i) => {
            const nextDate = dates[i + 1]?.date;
            const endDate = nextDate
                ? moment(nextDate).subtract(1, 'day').format('YYYY-MM-DD')
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
                        activities: d.activities.map((a) => ({
                            id: uuidToNumericId(a.id),
                            name: a.name,
                            place: a.place ?? undefined,
                            location: a.location ?? undefined,
                            startTime: a.startTime ?? undefined,
                            endTime: a.endTime ?? undefined,
                            cost: a.cost ?? undefined,
                            note: a.notes ?? undefined,
                        })),
                    },
                ],
            };
        });
    }

    return {
        name: it.name ?? '',
        startDate: it.startDate ?? undefined,
        endDate: it.endDate ?? undefined,
        status: it.status
            ? { id: it.status.id, name: it.status.name }
            : undefined,
        type: it.interaryType
            ? {
                  id: 0, // numeric id only matters for the single/multi route picker
                  name: it.interaryType.name,
                  route: '',
                  steps: { BASIC: 0, FRIEND: 0, FINISH: 0 },
              }
            : undefined,
        budget: it.budget ?? undefined,
        total: it.budget ?? undefined,
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
