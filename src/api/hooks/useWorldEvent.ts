import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { fetchWorldEvent, type WorldEventResult } from 'api/worldEventApi';
import { activeLang } from 'i18n';

/**
 * Biggest upcoming world event — open to everyone. The backend's weekly cache
 * (`WorldEventCache`) means one OpenAI call per ISO week PER LANGUAGE serves
 * the entire audience, so there's no reason to gate.
 *
 * The event content (name, description, hype, place + country names) is
 * generated in the active UI language, so the query is keyed by language and
 * re-fetches when the user switches languages.
 *
 * Resolves to `null` when no major event is found (backend 204).
 */
export const useWorldEvent = () => {
    // Subscribe to language changes so the query key updates on switch.
    useTranslation();
    const lang = activeLang();
    return useQuery<WorldEventResult | null>({
        queryKey: ['me', 'world-event', lang],
        queryFn: () => fetchWorldEvent(lang),
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });
};
