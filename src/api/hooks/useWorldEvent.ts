import { useQuery } from '@tanstack/react-query';
import { fetchWorldEvent, type WorldEventResult } from 'api/worldEventApi';
import { useUser } from 'context/UserContext';

/**
 * Biggest upcoming world event — open to everyone. The backend's
 * weekly shared cache (`WorldEventCache`) means one OpenAI call per
 * ISO week serves the entire audience, so there's no reason to gate.
 *
 * Resolves to `null` when no major event is found (backend 204).
 */
export const useWorldEvent = () => {
    return useQuery<WorldEventResult | null>({
        queryKey: ['me', 'world-event'],
        queryFn: fetchWorldEvent,
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });
};
