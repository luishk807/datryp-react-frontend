import { useQuery } from '@tanstack/react-query';
import {
    fetchEssentialApps,
    type EssentialAppsResult,
} from 'api/essentialAppsApi';
import { STATIC_DETAIL_CACHE } from 'api/queryClient';

/**
 * Curated "essential apps" for a country, keyed by ISO-2 code. The data is
 * static and language-independent (English notes for now), so it's keyed on
 * the code alone and cached hard. Disabled on a blank / too-short code so it
 * never fires a 422 on a cold URL.
 */
export const useEssentialApps = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    return useQuery<EssentialAppsResult | null>({
        queryKey: ['essential-apps', trimmed],
        queryFn: () => fetchEssentialApps(trimmed),
        enabled: trimmed.length >= 2,
        ...STATIC_DETAIL_CACHE,
        retry: 1,
    });
};
