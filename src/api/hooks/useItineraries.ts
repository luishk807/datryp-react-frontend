/**
 * React Query hooks for the Python backend's itinerary endpoints.
 *
 * - `useMyItineraries` — flat list of itineraries the user owns/organizes/attends.
 *   Returns the raw shape from the API; UI does its own single/multi split via
 *   `interaryType.name` (frontend types call this the discriminator).
 * - `useSaveItinerary` — create-or-replace (omit `id` to create).
 * - `useDeleteItinerary` — soft-delete (owner or organizer).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClientError, gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';
import { TripCapReachedError } from 'api/paywallError';
import { ITINERARY_TYPE } from 'constants';

// ── Types mirroring the GraphQL schema ───────────────────────────────────────

export interface ApiUserPublic {
    id: string;
    email: string;
    name: string | null;
}

export interface ApiCountry {
    id: string;
    name: string;
    code: string;
    local: string | null;
    image: string | null;
}

export interface ApiFlightInfo {
    departDate: string | null;
    arrivalDate: string | null;
    flightNumber: string | null;
    departAirport: string | null;
    arrivalAirport: string | null;
}

export interface ApiActivityBudget {
    id: string;
    user: ApiUserPublic;
    amount: number;
}

export interface ApiActivity {
    id: string;
    name: string;
    place: string | null;
    location: string | null;
    startTime: string | null;
    endTime: string | null;
    cost: number | null;
    notes: string | null;
    image: string | null;
    budget: number | null;
    status: { id: string; name: string } | null;
    budgets: ApiActivityBudget[];
    /** `'place' | 'note' | 'flight'`. Null on rows persisted before
     *  the kind column shipped; frontend defaults those to `'place'`. */
    kind: string | null;
    /** One row per flight leg. Empty for non-flight activities. */
    flightSegments: ApiFlightInfo[];
}

export interface ApiItineraryDate {
    id: string;
    date: string;
    country: ApiCountry | null;
    flightInfo: ApiFlightInfo | null;
    activities: ApiActivity[];
}

export interface ApiItinerary {
    id: string;
    name: string | null;
    startDate: string | null;
    endDate: string | null;
    budget: number | null;
    image: string | null;
    status: { id: string; name: string } | null;
    interaryType: { id: string; name: string };
    user: ApiUserPublic;
    friends: ApiUserPublic[];
    organizers: ApiUserPublic[];
    country: ApiCountry | null;
    flightInfo: ApiFlightInfo | null;
    intenaryDates: ApiItineraryDate[];
}

export interface FlightInfoInput {
    departDate?: string | null;
    arrivalDate?: string | null;
    flightNumber?: string | null;
    departAirport?: string | null;
    arrivalAirport?: string | null;
}

export interface ActivityBudgetInput {
    userId: string;
    amount: number;
}

export interface ActivityInput {
    name: string;
    place?: string | null;
    location?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    cost?: number | null;
    notes?: string | null;
    image?: string | null;
    budget?: number | null;
    /** Backend `trip_statuses.id` UUID. Same lookup as the trip-level status —
     *  Planning / Confirmed / Completed / Cancelled. Null means unset. */
    tripStatusId?: string | null;
    budgets?: ActivityBudgetInput[];
    /** `'place' | 'note' | 'flight'`. */
    kind?: string | null;
    /** Flight legs, in chronological depart order. Empty for non-flight. */
    flightSegments?: FlightInfoInput[];
}

export interface ItineraryDayInput {
    date: string;
    countryId?: string | null;
    flightInfo?: FlightInfoInput | null;
    activities: ActivityInput[];
}

export interface SaveItineraryInput {
    /** Omit to create; include to update. */
    id?: string;
    interaryTypeId: string;
    name?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    budget?: number | null;
    image?: string | null;
    tripStatusId?: string | null;
    organizerIds: string[];
    participantIds: string[];
    /** Single-destination only — root country / flight. */
    countryId?: string | null;
    flightInfo?: FlightInfoInput | null;
    days: ItineraryDayInput[];
    /** Per-save opt-out: when false, the backend skips both the email and
     *  the in-app notification fan-out for this save. Defaults to true so
     *  the silence has to be explicit. */
    notifyParticipants?: boolean;
}

export interface DeleteItineraryArgs {
    id: string;
    notifyParticipants?: boolean;
}

// ── Queries / mutations ──────────────────────────────────────────────────────

const ITINERARY_FIELDS = gql`
    fragment ItineraryFields on Itinerary {
        id
        name
        startDate
        endDate
        budget
        image
        status {
            id
            name
        }
        interaryType {
            id
            name
        }
        user {
            id
            email
            name
        }
        friends {
            id
            email
            name
        }
        organizers {
            id
            email
            name
        }
        country {
            id
            name
            code
            local
            image
        }
        flightInfo {
            departDate
            arrivalDate
            flightNumber
            departAirport
            arrivalAirport
        }
        intenaryDates {
            id
            date
            country {
                id
                name
                code
                local
                image
            }
            flightInfo {
                departDate
                arrivalDate
                flightNumber
                departAirport
                arrivalAirport
            }
            activities {
                id
                name
                place
                location
                startTime
                endTime
                cost
                notes
                image
                budget
                status {
                    id
                    name
                }
                budgets {
                    id
                    user {
                        id
                        email
                        name
                    }
                    amount
                }
                kind
                flightSegments {
                    departDate
                    arrivalDate
                    flightNumber
                    departAirport
                    arrivalAirport
                }
            }
        }
    }
`;

const MY_ITINERARIES_QUERY = gql`
    ${ITINERARY_FIELDS}
    query MyItineraries {
        myItineraries {
            intineraries {
                ...ItineraryFields
            }
        }
    }
`;

const SAVE_ITINERARY_MUTATION = gql`
    ${ITINERARY_FIELDS}
    mutation SaveItinerary($input: SaveItineraryInput!) {
        saveItinerary(input: $input) {
            ...ItineraryFields
        }
    }
`;

const DELETE_ITINERARY_MUTATION = gql`
    mutation DeleteItinerary($id: ID!, $notifyParticipants: Boolean) {
        deleteItinerary(id: $id, notifyParticipants: $notifyParticipants)
    }
`;

export const useMyItineraries = (options?: { enabled?: boolean }) =>
    useQuery({
        queryKey: ['myItineraries'],
        queryFn: async () => {
            const data = await pythonGqlClient.request<{
                myItineraries: { intineraries: ApiItinerary[] };
            }>(MY_ITINERARIES_QUERY);
            return data.myItineraries.intineraries;
        },
        enabled: options?.enabled ?? true,
    });

export const useSaveItinerary = () => {
    const queryClient = useQueryClient();
    return useMutation<ApiItinerary, Error, SaveItineraryInput>({
        mutationFn: async (input) => {
            try {
                const data = await pythonGqlClient.request<{ saveItinerary: ApiItinerary }>(
                    SAVE_ITINERARY_MUTATION,
                    { input }
                );
                return data.saveItinerary;
            } catch (err) {
                // Free-tier paywall hit — rethrow as a typed error so the
                // form can show a paywall modal instead of a save-failed toast.
                if (err instanceof ClientError) {
                    const capError = err.response.errors?.find(
                        (e) => e.extensions?.code === 'TRIP_CAP_REACHED'
                    );
                    if (capError) {
                        const ext = capError.extensions ?? {};
                        const currentCount =
                            typeof ext.currentCount === 'number' ? ext.currentCount : 0;
                        const cap = typeof ext.cap === 'number' ? ext.cap : 1;
                        throw new TripCapReachedError({
                            currentCount,
                            cap,
                            message: capError.message,
                        });
                    }
                }
                throw err;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myItineraries'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        // Don't retry a paywall hit — same input will block again.
        retry: (_failureCount, error) => !(error instanceof TripCapReachedError),
    });
};

export const useDeleteItinerary = () => {
    const queryClient = useQueryClient();
    return useMutation<boolean, Error, DeleteItineraryArgs | string>({
        mutationFn: async (input) => {
            // Accept both legacy `mutate(id)` and new `mutate({ id,
            // notifyParticipants })` shapes so callers can migrate at
            // their own pace.
            const variables =
                typeof input === 'string'
                    ? { id: input, notifyParticipants: true }
                    : {
                          id: input.id,
                          notifyParticipants: input.notifyParticipants ?? true,
                      };
            const data = await pythonGqlClient.request<{ deleteItinerary: boolean }>(
                DELETE_ITINERARY_MUTATION,
                variables
            );
            return data.deleteItinerary;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myItineraries'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

/** Discriminator helpers — matches `interaryType.name` rows seeded in the backend. */
export const isSingleDestination = (itin: ApiItinerary) =>
    itin.interaryType.name === ITINERARY_TYPE.SINGLE;
export const isMultiDestination = (itin: ApiItinerary) =>
    itin.interaryType.name === ITINERARY_TYPE.MULTI;
