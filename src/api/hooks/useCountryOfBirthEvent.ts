import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
    fetchCountryOfBirthEvent,
    type CountryOfBirthEventResult,
} from 'api/countryOfBirthEventApi';
import { activeLang } from 'i18n';
import { useUser } from 'context/UserContext';

/**
 * Biggest upcoming event in the user's country of birth + 4 host cities.
 * Mirrors `useWorldEvent` but per-user — the backend keys its cache on
 * the user's `country_of_birth_code` and surfaces a 204 when the field
 * is unset, which this hook translates to `null`.
 *
 * Gated on a logged-in user with `countryOfBirthCode` set so we don't
 * hit the endpoint just to receive a 204. The endpoint itself handles
 * the unset case gracefully too — this gate is just to skip the
 * round-trip.
 */
export const useCountryOfBirthEvent = () => {
    const { user } = useUser();
    useTranslation();
    const lang = activeLang();
    return useQuery<CountryOfBirthEventResult | null>({
        queryKey: [
            'me',
            'country-of-birth-event',
            user?.countryOfBirthCode ?? null,
            lang,
        ],
        queryFn: () => fetchCountryOfBirthEvent(lang),
        enabled: Boolean(user?.countryOfBirthCode),
        staleTime: 30 * 60 * 1000,
        retry: 1,
    });
};
