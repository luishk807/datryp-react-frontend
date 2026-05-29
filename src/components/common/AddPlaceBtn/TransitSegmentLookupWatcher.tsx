import { useEffect, useRef, useState } from 'react';
import { useTransitLookup } from 'api/hooks/useTransitLookup';
import type { TransitKind, TransitLookupResult } from 'api/transitLookupApi';

interface TransitSegmentLookupWatcherProps {
    /** Carrier / operator (Amtrak, FlixBus, Renfe, …). */
    operator?: string;
    /** Route / train / bus number. */
    number?: string;
    /** `train` or `bus`. Rental cars deliberately don't have a
     *  lookup — their "number" is a private booking confirmation. */
    kind: TransitKind;
    /** Optional date context — improves day-of-week schedule accuracy. */
    departDate?: string;
    /** Optional trip country — disambiguates operators that run
     *  cross-border or share names (e.g. "Amtrak" vs "Amtrak West"). */
    country?: string;
    onResult: (result: TransitLookupResult) => void;
    onLoadingChange?: (loading: boolean) => void;
    /** Settled-but-no-match callback. Fires once per (operator,
     *  number, kind, country, date) tuple so the parent can show a
     *  "couldn't find — fill in manually" hint. */
    onNotFound?: (operatorAndNumber: string) => void;
}

/**
 * Per-segment OpenAI-backed schedule lookup. Sibling of
 * `FlightSegmentLookupWatcher`. Fires `onResult` when the backend
 * returns a populated schedule, `onNotFound` when the lookup
 * settled empty — letting the parent surface the same friendly
 * "couldn't find — fill in manually" UX the flight watcher uses.
 *
 * Debounce: 700ms (a touch longer than flight's 600ms — operator +
 * number is two fields, users often pause between them). Each
 * segment mounts its own watcher so multi-leg trips get parallel
 * lookups.
 */
const TransitSegmentLookupWatcher = ({
    operator,
    number,
    kind,
    departDate,
    country,
    onResult,
    onLoadingChange,
    onNotFound,
}: TransitSegmentLookupWatcherProps) => {
    const [debouncedOperator, setDebouncedOperator] = useState('');
    const [debouncedNumber, setDebouncedNumber] = useState('');
    const appliedKeyRef = useRef<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedOperator((operator ?? '').trim());
            setDebouncedNumber((number ?? '').trim());
        }, 700);
        return () => clearTimeout(timer);
    }, [operator, number]);

    const { data, isFetching, isSuccess } = useTransitLookup(
        debouncedOperator,
        debouncedNumber,
        kind,
        country,
        departDate,
    );

    useEffect(() => {
        onLoadingChange?.(isFetching);
    }, [isFetching, onLoadingChange]);

    useEffect(() => {
        const key = `${kind}|${debouncedOperator}|${debouncedNumber}|${country ?? ''}|${departDate ?? ''}`;
        if (appliedKeyRef.current === key) return;
        if (data) {
            appliedKeyRef.current = key;
            onResult(data);
            return;
        }
        if (
            isSuccess &&
            !data &&
            debouncedOperator &&
            debouncedNumber
        ) {
            appliedKeyRef.current = key;
            onNotFound?.(`${debouncedOperator} ${debouncedNumber}`);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        data,
        isSuccess,
        kind,
        debouncedOperator,
        debouncedNumber,
        country,
        departDate,
    ]);

    return null;
};

export default TransitSegmentLookupWatcher;
