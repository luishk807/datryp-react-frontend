import { useUser } from 'context/UserContext';
import { useUserLocation } from 'hooks/useUserLocation';

export type PassportSource = 'passport' | 'residence' | 'ip';

export interface PassportCountry {
    /** ISO-2 uppercase. */
    code: string;
    /** Where the code came from — 'passport' (explicit), 'residence' (home
     *  country fallback), or 'ip' (geolocation guess). Lets the UI nudge
     *  harder toward setting a real passport when we're only guessing. */
    source: PassportSource;
}

/**
 * The traveler's passport / citizenship country for visa framing, resolved
 * with the precedence the product wants: explicit passport → home/residence
 * country → IP geolocation. Visa rules key on the passport you carry, not
 * where your device happens to be, so IP is a last resort only.
 *
 * Returns `null` only when we have nothing at all (logged-out AND the IP
 * lookup failed). The IP lookup is skipped entirely whenever the profile
 * already answers, so a signed-in user never pays the ipapi.co round-trip.
 */
export const usePassportCountry = (): {
    data: PassportCountry | null;
    isLoading: boolean;
} => {
    const { user } = useUser();
    const passport = user?.passportCountryCode?.toUpperCase() || null;
    const residence = user?.homeCountryCode?.toUpperCase() || null;
    const ip = useUserLocation(!passport && !residence);

    if (passport) return { data: { code: passport, source: 'passport' }, isLoading: false };
    if (residence) return { data: { code: residence, source: 'residence' }, isLoading: false };
    const ipCode = ip.data?.countryCode?.toUpperCase();
    if (ipCode) return { data: { code: ipCode, source: 'ip' }, isLoading: false };
    return { data: null, isLoading: ip.isLoading };
};
