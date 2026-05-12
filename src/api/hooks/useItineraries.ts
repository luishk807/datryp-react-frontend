/**
 * React Query hooks for the Python backend's itinerary endpoints.
 *
 * - `useMyItineraries` — flat list of itineraries the user owns/organizes/attends.
 *   Returns the raw shape from the API; UI does its own single/multi split via
 *   `interaryType.name` (frontend types call this the discriminator).
 * - `useSaveItinerary` — create-or-replace (omit `id` to create).
 * - `useDeleteItinerary` — soft-delete (owner only).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';

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
    mutation DeleteItinerary($id: ID!) {
        deleteItinerary(id: $id)
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
            const data = await pythonGqlClient.request<{ saveItinerary: ApiItinerary }>(
                SAVE_ITINERARY_MUTATION,
                { input }
            );
            return data.saveItinerary;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myItineraries'] });
        },
    });
};

export const useDeleteItinerary = () => {
    const queryClient = useQueryClient();
    return useMutation<boolean, Error, string>({
        mutationFn: async (id) => {
            const data = await pythonGqlClient.request<{ deleteItinerary: boolean }>(
                DELETE_ITINERARY_MUTATION,
                { id }
            );
            return data.deleteItinerary;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myItineraries'] });
        },
    });
};

/** Discriminator helpers — matches `interaryType.name` rows seeded in the backend. */
export const isSingleDestination = (itin: ApiItinerary) =>
    itin.interaryType.name === 'Single Destination Trip';
export const isMultiDestination = (itin: ApiItinerary) =>
    itin.interaryType.name === 'Multi Destination Trip';
