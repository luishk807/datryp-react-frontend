import { useQuery } from '@tanstack/react-query';
import {
    lookupFlight,
    type FlightLookupResult,
} from 'api/flightLookupApi';

/**
 * Lookup a flight by number + departure date.
 *
 * The hook is enabled only when:
 *   - `number` is at least 3 chars (e.g. "BA1")
 *   - `date` is a YYYY-MM-DD string
 *   - `enabled` (caller-controlled flag) is true
 *
 * Returns `null` on no-match — callers should leave the user's typed
 * value alone in that case (silent-failure UX, per the original scope
 * decision).
 *
 * Cache: 1 hour on the same (number, date) pair. Flight schedules are
 * stable within a day, so refetching the same number on the same date
 * within the session is wasteful.
 *
 * Debouncing happens at the call site (the consumer passes a debounced
 * `number` string). Keeping the hook stateless lets multiple segments
 * each have their own debounced input without coordinating here.
 */
export const useFlightLookup = (
    number: string,
    date: string,
    enabled: boolean = true,
) => {
    const trimmed = number.trim().toUpperCase();
    return useQuery<FlightLookupResult | null>({
        queryKey: ['flightLookup', trimmed, date],
        queryFn: () => lookupFlight(trimmed, date),
        enabled:
            enabled && trimmed.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(date),
        staleTime: 60 * 60 * 1000,
        retry: 0,
    });
};
