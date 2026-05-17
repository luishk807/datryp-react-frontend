import { useQuery } from '@tanstack/react-query';

const SESSION_KEY = 'datryp:user-currency';
const FALLBACK = 'USD';

/**
 * The visiting user's home currency, detected from their IP via ipapi.co
 * (free tier, no key, supports CORS). Cached for the session in
 * sessionStorage so we only hit the network once. Falls back to USD on any
 * error — never throws.
 *
 * Privacy note: ipapi.co receives the user's IP. That's intrinsic to IP
 * geolocation; we don't store the IP server-side ourselves.
 */
export const useUserCurrency = () =>
    useQuery({
        queryKey: ['user-currency'],
        queryFn: async () => {
            if (typeof window === 'undefined') return FALLBACK;
            const cached = window.sessionStorage.getItem(SESSION_KEY);
            if (cached) return cached;
            try {
                const resp = await fetch('https://ipapi.co/json/');
                if (!resp.ok) return FALLBACK;
                const data = (await resp.json()) as { currency?: string };
                const code = (data.currency ?? FALLBACK).toUpperCase();
                window.sessionStorage.setItem(SESSION_KEY, code);
                return code;
            } catch {
                return FALLBACK;
            }
        },
        staleTime: Infinity,
        gcTime: Infinity,
        retry: false,
    });
