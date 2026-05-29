import { useQuery } from '@tanstack/react-query';
import {
    lookupTransit,
    type TransitKind,
    type TransitLookupResult,
} from 'api/transitLookupApi';

/**
 * Lookup a train / bus by operator + number. Sibling of
 * `useFlightLookup` — same fail-soft shape (returns `null` on
 * no-match) and same one-hour staleTime since transit schedules
 * are stable within a day.
 *
 * Enabled only when both operator and number are non-empty after
 * trim, so a single-field edit (just operator, or just number)
 * doesn't burn an OpenAI call.
 */
export const useTransitLookup = (
    operator: string,
    number: string,
    kind: TransitKind,
    country?: string,
    departDate?: string,
    enabled: boolean = true,
) => {
    const op = operator.trim();
    const num = number.trim();
    const c = country?.trim() ?? '';
    const d = departDate?.trim() ?? '';
    return useQuery<TransitLookupResult | null>({
        queryKey: ['transitLookup', kind, op.toLowerCase(), num, c, d],
        queryFn: () => lookupTransit(op, num, kind, c || undefined, d || undefined),
        enabled: enabled && op.length > 0 && num.length > 0,
        staleTime: 60 * 60 * 1000,
        retry: 0,
    });
};
