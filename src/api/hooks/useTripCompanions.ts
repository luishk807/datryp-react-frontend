/**
 * Reads a Completed trip's "friends who joined" data (each other member's
 * trip rating + favorite place) via GET /me/trip-companions/{id}.
 */
import { useQuery } from '@tanstack/react-query';
import { getTripCompanions } from 'api/tripCompanionsApi';

export const tripCompanionsKey = (tripId: string) =>
    ['tripCompanions', tripId] as const;

export const useTripCompanions = (
    tripId: string | undefined,
    enabled = true
) =>
    useQuery({
        queryKey: tripCompanionsKey(tripId ?? ''),
        queryFn: () => getTripCompanions(tripId as string),
        enabled: Boolean(tripId) && enabled,
        staleTime: 60_000,
    });
