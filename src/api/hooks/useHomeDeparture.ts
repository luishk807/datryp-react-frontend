import { useQuery } from '@tanstack/react-query';
import {
    fetchNearestAirport,
    fetchNearestTrainStation,
    type NearestAirport,
    type NearestStation,
} from 'api/homeDepartureApi';
import { useUser } from 'context/UserContext';

/** One hour. The underlying result only changes when the user updates
 *  their home city (which invalidates these queries explicitly via
 *  `useUpdateMyPreferences`), so a long staleTime keeps the trip-
 *  creation flow snappy — no spinner on every modal open. */
const STALE_MS = 60 * 60 * 1000;

export const nearestAirportKey = ['me', 'nearest-airport'] as const;
export const nearestTrainStationKey = ['me', 'nearest-train-station'] as const;

/** Nearest airport to the user's home city. Returns `null` (not an
 *  error) when the user hasn't set a home city — call sites treat that
 *  case as "skip the auto-seed", same as a missing dataset row. */
export const useNearestAirport = () => {
    const { user } = useUser();
    return useQuery<NearestAirport | null>({
        queryKey: nearestAirportKey,
        queryFn: fetchNearestAirport,
        // No point hitting the endpoint without coordinates — the server
        // would return `airport: null` anyway, but skipping avoids a
        // round-trip on every modal mount for users without a home city.
        enabled:
            Boolean(user) &&
            user?.homeLatitude != null &&
            user?.homeLongitude != null,
        staleTime: STALE_MS,
        retry: 1,
    });
};

/** Nearest train station — backend stub returns `null` until the train
 *  dataset ships. Call sites still wire this up so a future backend
 *  drop flips the seeding on without further frontend work. */
export const useNearestTrainStation = () => {
    const { user } = useUser();
    return useQuery<NearestStation | null>({
        queryKey: nearestTrainStationKey,
        queryFn: fetchNearestTrainStation,
        enabled:
            Boolean(user) &&
            user?.homeLatitude != null &&
            user?.homeLongitude != null,
        staleTime: STALE_MS,
        retry: 1,
    });
};
