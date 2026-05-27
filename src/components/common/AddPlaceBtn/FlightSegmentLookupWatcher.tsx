import { useEffect, useRef, useState } from 'react';
import { useFlightLookup } from 'api/hooks/useFlightLookup';
import type { FlightLookupResult } from 'api/flightLookupApi';

interface FlightSegmentLookupWatcherProps {
    flightNumber?: string;
    departDate?: string;
    onResult: (result: FlightLookupResult) => void;
}

/**
 * Invisible per-segment helper that fires `/flights/lookup` whenever
 * the user has typed a plausible flight number AND a depart date. When
 * the result lands, it forwards it to the parent via `onResult`. The
 * parent decides whether to overwrite empty segment fields (typical)
 * or leave the user's manual entries alone.
 *
 * Why a separate component rather than `useEffect` in the parent: each
 * segment needs its own debounced + cached lookup, and hooks can't be
 * called in a loop. Mounting one of these per segment gives each its
 * own hook instance.
 *
 * Debounce: 600ms after the last (number, date) change. Cancels on
 * unmount so toggling away from Flight kind doesn't fire stale
 * lookups.
 */
const FlightSegmentLookupWatcher = ({
    flightNumber,
    departDate,
    onResult,
}: FlightSegmentLookupWatcherProps) => {
    const [debouncedNumber, setDebouncedNumber] = useState('');
    const [debouncedDate, setDebouncedDate] = useState('');
    // Track which (number, date) pair we've already pushed to the
    // parent so a re-render that happens to coincide with the same
    // cached result doesn't fire `onResult` again — preventing
    // a re-overwrite of fields the user has since edited.
    const appliedKeyRef = useRef<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedNumber((flightNumber ?? '').trim());
            setDebouncedDate(departDate ?? '');
        }, 600);
        return () => clearTimeout(timer);
    }, [flightNumber, departDate]);

    const { data } = useFlightLookup(debouncedNumber, debouncedDate);

    useEffect(() => {
        if (!data) return;
        const key = `${debouncedNumber}|${debouncedDate}`;
        if (appliedKeyRef.current === key) return;
        appliedKeyRef.current = key;
        onResult(data);
        // `onResult` is recreated each render in the parent; we only
        // re-run when a fresh `data` lands for a new key, so we can
        // safely exclude it from deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, debouncedNumber, debouncedDate]);

    return null;
};

export default FlightSegmentLookupWatcher;
