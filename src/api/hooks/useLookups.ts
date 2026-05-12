/**
 * Lookup-table hooks for the Python backend.
 * Long staleTime — these rarely change.
 */

import { useQuery } from '@tanstack/react-query';
import { gql } from 'graphql-request';
import { pythonGqlClient } from 'api/pythonGqlClient';

export interface LookupRow {
    id: string;
    name: string;
}

const ITINERARY_TYPES_QUERY = gql`
    query ItineraryTypes {
        itineraryTypes {
            id
            name
        }
    }
`;

const TRIP_STATUSES_QUERY = gql`
    query TripStatuses {
        tripStatuses {
            id
            name
        }
    }
`;

const FIVE_MINUTES = 5 * 60 * 1000;

export const useItineraryTypes = () =>
    useQuery({
        queryKey: ['itineraryTypes'],
        queryFn: async () => {
            const data = await pythonGqlClient.request<{ itineraryTypes: LookupRow[] }>(
                ITINERARY_TYPES_QUERY
            );
            return data.itineraryTypes;
        },
        staleTime: FIVE_MINUTES,
    });

export const useTripStatuses = () =>
    useQuery({
        queryKey: ['tripStatuses'],
        queryFn: async () => {
            const data = await pythonGqlClient.request<{ tripStatuses: LookupRow[] }>(
                TRIP_STATUSES_QUERY
            );
            return data.tripStatuses;
        },
        staleTime: FIVE_MINUTES,
    });
