import { useQuery } from '@tanstack/react-query';

interface FrankfurterResponse {
    amount: number;
    base: string;
    date: string;
    rates: Record<string, number>;
}

/**
 * USD-based foreign-exchange rates from Frankfurter (ECB data, free, no key,
 * supports CORS). Returns a map `{ [code]: rate_per_usd }` covering ~30 major
 * currencies plus USD itself (rate = 1).
 *
 * Endpoint moved from `api.frankfurter.app` → `api.frankfurter.dev/v1/...`;
 * the old host now 301-redirects, and the redirect response carries no CORS
 * headers, so the browser blocks it. Pinned to the new host explicitly.
 *
 * Cached for 6h client-side — rates only change once a day and we don't
 * need second-by-second accuracy for travel previews. Failures are
 * tolerated by the consumer (CurrencyWidget falls back to the OpenAI-derived
 * `rate_per_usd` shipped with the destination payload).
 */
export const useFxRates = () =>
    useQuery<Record<string, number>>({
        queryKey: ['fx-rates'],
        queryFn: async () => {
            const resp = await fetch(
                'https://api.frankfurter.dev/v1/latest?from=USD'
            );
            if (!resp.ok) {
                throw new Error(`FX fetch failed: ${resp.status}`);
            }
            const data = (await resp.json()) as FrankfurterResponse;
            return { USD: 1, ...data.rates };
        },
        staleTime: 6 * 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 1,
    });
