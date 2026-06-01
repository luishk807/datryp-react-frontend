import { useQuery } from '@tanstack/react-query';
import {
    searchFlightDepartures,
    type FlightDepartureOption,
} from 'api/flightDeparturesApi';

/**
 * Airport-departures search for the "Find my flight" picker.
 *
 * The hook is enabled only when ALL of:
 *   - `airport` is a 3-letter IATA code
 *   - `date` is a YYYY-MM-DD string
 *   - `enabled` (caller-controlled flag) is true
 *
 * The `enabled` flag is the explicit-Search gate: the upstream provider
 * is rate-limited, so the UI flips this to true only when the user taps
 * "Search" — never on keystroke. Cache: 1 hour on the same
 * (airport, date, fromTime, airline) tuple so re-opening the picker or
 * tweaking the client-side text filter doesn't burn a fresh call.
 */
export const useFlightDepartures = (
    airport: string,
    date: string,
    fromTime?: string,
    airline?: string,
    enabled: boolean = true,
) => {
    const trimmedAirport = airport.trim().toUpperCase();
    const trimmedAirline = airline?.trim().toUpperCase() || undefined;
    return useQuery<FlightDepartureOption[]>({
        queryKey: [
            'flightDepartures',
            trimmedAirport,
            date,
            fromTime,
            trimmedAirline,
        ],
        queryFn: () =>
            searchFlightDepartures({
                airport: trimmedAirport,
                date,
                fromTime,
                airline: trimmedAirline,
            }),
        enabled:
            enabled &&
            /^[A-Za-z]{3}$/.test(trimmedAirport) &&
            /^\d{4}-\d{2}-\d{2}$/.test(date),
        staleTime: 60 * 60 * 1000,
        retry: 0,
    });
};
