import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    fetchPlaceSuggestions,
    type PlaceSuggestion,
} from 'api/placeSuggestionsApi';
import { activeLang } from 'i18n';
import { useUser } from 'context/UserContext';

/**
 * Personalized "Places you might love" picks for the signed-in user.
 * Available to every signed-in user — the backend's weekly per-user
 * cache (see `services.place_suggestions` on the Python side) bounds
 * OpenAI cost regardless of free/paid status.
 *
 * Cached for 30 minutes client-side so re-mounting the homepage doesn't
 * even hit the backend within a typical session.
 */
export const usePlaceSuggestions = () => {
    const { user } = useUser();
    useTranslation();
    const lang = activeLang();
    return useQuery<PlaceSuggestion[]>({
        queryKey: ['me', 'place-suggestions', lang],
        queryFn: () => fetchPlaceSuggestions(lang),
        enabled: Boolean(user),
        staleTime: 30 * 60 * 1000,
        // OpenAI calls can be slow / occasionally hiccup — one retry is
        // plenty; don't hammer the endpoint on a real outage.
        retry: 1,
    });
};
