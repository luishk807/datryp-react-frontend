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
import { capture as captureEvent } from 'lib/posthog';
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

export interface ApiTransportLeg {
    legIndex: number;
    departPoint: string | null;
    arrivePoint: string | null;
    departAt: string | null;
    arriveAt: string | null;
    carrier: string | null;
    number: string | null;
    seatOrClass: string | null;
}

export interface ApiTransportBudgetEntry {
    id: string;
    user: ApiUserPublic;
    amount: number;
}

/** A mode-agnostic transport booking (flight | train | bus | rental_car). A
 *  flight is just `mode === 'flight'`. Generalizes the old ApiFlightInfo. */
export interface ApiTransport {
    mode: string;
    /** Headline cached view of leg 0 (point/datetime/number). */
    departPoint: string | null;
    arrivePoint: string | null;
    departAt: string | null;
    arriveAt: string | null;
    carrier: string | null;
    number: string | null;
    /** Total cost for the booking (whole journey). Null for activity-owned
     *  transports — those keep their cost on the activity row. */
    cost: number | null;
    /** Single payer (one participant covered the booking). Auto-derived from
     *  `budgets` when the split has exactly one entry. */
    paidBy: ApiUserPublic | null;
    /** ISO date (`YYYY-MM-DD`) the booking was paid on. Null when unpaid. */
    paidAt: string | null;
    /** Per-friend split of the cost. Empty when no split is set. */
    budgets: ApiTransportBudgetEntry[];
    /** Per-leg breakdown. At minimum a one-element list mirroring the
     *  headline so the client can iterate without special-casing single-leg. */
    legs: ApiTransportLeg[];
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
    /** Organizer attestation that this activity was paid for. `paidAt`
     *  is the ISO date (`YYYY-MM-DD`) of the payment; `paidBy` is the
     *  participant who paid. Cleared together when unmarked. */
    paidAt: string | null;
    paidBy: ApiUserPublic | null;
    /** `'place' | 'note' | 'flight'`. Null on rows persisted before
     *  the kind column shipped; frontend defaults those to `'place'`. */
    kind: string | null;
    /** The transport for a transport-kind activity (mode + legs). Null for
     *  non-transport activities. Cost stays on the activity row, so this
     *  transport's `cost`/`budgets` are null/empty. */
    transport: ApiTransport | null;
    /** Structured place data set when the user added the activity via
     *  PlaceAutocomplete / PlaceSuggestions. Null on free-text
     *  activities ("dinner with mom"). Drives the Mapper trip-link
     *  cascade — a visited-place pin on /my-map gets a "View trip"
     *  CTA when a matching itinerary activity exists. */
    placeKey: string | null;
    placeCity: string | null;
    placeCountry: string | null;
    countryCode: string | null;
    latitude: number | null;
    longitude: number | null;
    /** Original pasted URL (TripAdvisor / Yelp / Maps) for a PLACE added
     *  via smart-entry. Null on typed entries and non-place kinds. */
    sourceUrl: string | null;
}

export interface ApiItineraryDate {
    id: string;
    date: string;
    country: ApiCountry | null;
    transport: ApiTransport | null;
    activities: ApiActivity[];
}

/** A first-class, date-range destination on a multi-destination trip. Owns
 *  the country + arrival transport; `intenaryDates` are this destination's own
 *  days (with activities). Empty for single trips. */
export interface ApiDestination {
    id: string;
    country: ApiCountry;
    transport: ApiTransport | null;
    startDate: string;
    endDate: string;
    order: number;
    note: string | null;
    intenaryDates: ApiItineraryDate[];
}

export interface ApiItinerary {
    id: string;
    name: string | null;
    startDate: string | null;
    endDate: string | null;
    budget: number | null;
    image: string | null;
    note: string | null;
    status: { id: string; name: string } | null;
    interaryType: { id: string; name: string };
    user: ApiUserPublic;
    friends: ApiUserPublic[];
    organizers: ApiUserPublic[];
    country: ApiCountry | null;
    transport: ApiTransport | null;
    intenaryDates: ApiItineraryDate[];
    /** Multi-destination trips fill this with date-range destinations; single
     *  trips leave it empty. The flat `intenaryDates` stays populated for both
     *  (backward compatibility) — the adapter prefers `destinations`. */
    destinations: ApiDestination[];
}

export interface TransportLegInput {
    departPoint?: string | null;
    arrivePoint?: string | null;
    departAt?: string | null;
    arriveAt?: string | null;
    carrier?: string | null;
    number?: string | null;
    seatOrClass?: string | null;
}

export interface TransportBudgetInput {
    userId: string;
    amount: number;
}

export interface TransportInput {
    /** 'flight' | 'train' | 'bus' | 'rental_car'. Defaults to flight server-side. */
    mode?: string | null;
    departPoint?: string | null;
    arrivePoint?: string | null;
    departAt?: string | null;
    arriveAt?: string | null;
    carrier?: string | null;
    number?: string | null;
    seatOrClass?: string | null;
    cost?: number | null;
    /** UUID of the participant who paid. Null to clear. Auto-derived
     *  server-side when `budgets` has exactly one entry. */
    paidByUserId?: string | null;
    /** ISO date (`YYYY-MM-DD`) the booking was paid on. Null to clear. */
    paidAt?: string | null;
    /** Per-friend split entries. Omit / empty list = no split. */
    budgets?: TransportBudgetInput[];
    /** Per-leg breakdown. Backward-compatible: callers that only know the
     *  flat fields can omit this and the backend materializes a single
     *  leg_index=0 row mirroring them. When provided, legs are the source
     *  of truth — the flat fields become a cached view of legs[0]. */
    legs?: TransportLegInput[];
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
    /** Organizer attestation. `paidByUserId` is the participant's UUID
     *  who paid; `paidAt` is the ISO date. Both null clears the
     *  attestation. */
    paidByUserId?: string | null;
    paidAt?: string | null;
    budgets?: ActivityBudgetInput[];
    /** `'place' | 'note' | 'flight' | 'train' | 'bus' | 'rental_car'`. */
    kind?: string | null;
    /** Transport for a transport-kind activity (mode + legs). Null for
     *  non-transport activities. Cost stays on the activity row. */
    transport?: TransportInput | null;
    /** Structured place data captured when the user picks a real place
     *  from PlaceAutocomplete / PlaceSuggestions. All optional —
     *  free-text activities omit them and the backend stores nulls.
     *  `placeKey` is intentionally not in this input shape: the backend
     *  derives the canonical slug from (name, placeCity, placeCountry)
     *  via the same helper `visited_places` uses, so the FE can't
     *  fabricate a slug that wouldn't match other surfaces. */
    placeCity?: string | null;
    placeCountry?: string | null;
    countryCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    /** Original pasted URL for a PLACE added via smart-entry. Omitted /
     *  null for typed entries and non-place kinds. */
    sourceUrl?: string | null;
}

export interface ItineraryDayInput {
    date: string;
    countryId?: string | null;
    transport?: TransportInput | null;
    activities: ActivityInput[];
}

/** Multi-destination save unit. The destination owns country + arrival
 *  transport + date range; its `days` carry only date + activities. */
export interface DestinationInput {
    countryId: string;
    startDate: string;
    endDate: string;
    transport?: TransportInput | null;
    note?: string | null;
    order?: number;
    days: ItineraryDayInput[];
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
    /** Single-destination only — root country / transport. */
    countryId?: string | null;
    transport?: TransportInput | null;
    days: ItineraryDayInput[];
    /** Multi-destination trips send date-range destinations here. When present
     *  the backend uses these and ignores `days`; single trips omit it. */
    destinations?: DestinationInput[] | null;
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

const COUNTRY_FIELDS = gql`
    fragment CountryFields on Country {
        id
        name
        code
        local
        image
    }
`;

const TRANSPORT_FIELDS = gql`
    fragment TransportFields on Transport {
        mode
        departPoint
        arrivePoint
        departAt
        arriveAt
        carrier
        number
        cost
        paidAt
        paidBy {
            id
            email
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
        legs {
            legIndex
            departPoint
            arrivePoint
            departAt
            arriveAt
            carrier
            number
            seatOrClass
        }
    }
`;

const ACTIVITY_FIELDS = gql`
    fragment ActivityFields on Activity {
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
        paidAt
        paidBy {
            id
            email
            name
        }
        kind
        transport {
            ...TransportFields
        }
        placeKey
        placeCity
        placeCountry
        countryCode
        latitude
        longitude
        sourceUrl
    }
`;

const DAY_FIELDS = gql`
    ${COUNTRY_FIELDS}
    ${TRANSPORT_FIELDS}
    ${ACTIVITY_FIELDS}
    fragment DayFields on IntenaryDate {
        id
        date
        country {
            ...CountryFields
        }
        transport {
            ...TransportFields
        }
        activities {
            ...ActivityFields
        }
    }
`;

const ITINERARY_FIELDS = gql`
    ${DAY_FIELDS}
    fragment ItineraryFields on Itinerary {
        id
        name
        startDate
        endDate
        budget
        image
        note
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
            ...CountryFields
        }
        transport {
            ...TransportFields
        }
        intenaryDates {
            ...DayFields
        }
        destinations {
            id
            startDate
            endDate
            order
            note
            country {
                ...CountryFields
            }
            transport {
                ...TransportFields
            }
            intenaryDates {
                ...DayFields
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
        onSuccess: (saved, input) => {
            queryClient.invalidateQueries({ queryKey: ['myItineraries'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            // `trip_saved` covers both create (no `input.id`) and
            // edit-and-save (`input.id` present), distinguished via
            // `is_new`. Properties stay coarse — trip type slug —
            // no place names, no friend ids, no destination content.
            // The AI-build path emits its own `trip_generated` event
            // and doesn't go through this mutation.
            captureEvent('trip_saved', {
                is_new: !input?.id,
                trip_type: saved?.interaryType?.name ?? null,
                day_count: saved?.intenaryDates?.length ?? 0,
            });
        },
        // Retry at most once, and never on a paywall hit (same input blocks
        // again). The previous predicate returned true for every non-paywall
        // error with no failure cap, so a validation error (e.g. a missing
        // field) retried forever — leaving the "Saving your trip…" spinner
        // hung instead of surfacing the error. One retry covers a transient
        // network blip; a real validation error then rejects promptly.
        retry: (failureCount, error) =>
            failureCount < 1 && !(error instanceof TripCapReachedError),
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
