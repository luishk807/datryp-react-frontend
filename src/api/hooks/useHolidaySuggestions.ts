import { useQuery } from '@tanstack/react-query';
import {
    fetchHolidaySuggestions,
    type HolidaySuggestionsResult,
} from 'api/holidaySuggestionsApi';
import { useUser } from 'context/UserContext';

/**
 * Pro-only upcoming-holiday picks. The endpoint returns 402 for free
 * users and 401 for anonymous, so we gate on `isPaidMember || isAdmin`
 * to avoid wasted round-trips. The component hides itself in the same
 * cases.
 *
 * Cached 30 min client-side; backend caches 7d per user.
 */
export const useHolidaySuggestions = () => {
    const { user, isAdmin } = useUser();
    const entitled = Boolean(user && (user.isPaidMember || isAdmin));
    return useQuery<HolidaySuggestionsResult>({
        queryKey: ['me', 'holiday-suggestions'],
        queryFn: fetchHolidaySuggestions,
        enabled: entitled,
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });
};
