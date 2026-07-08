import { useUser } from 'context/UserContext';
import { useUserLocation } from 'hooks/useUserLocation';

export type OriginSource = 'residence' | 'ip';

export interface TravelerOrigin {
    /** Origin coordinates. Null when the saved home base has no geocode
     *  (rare — the city autocomplete geocodes on pick); the map then shows
     *  just the destination with no route line. */
    lat: number | null;
    lng: number | null;
    city: string;
    country: string;
    countryCode: string;
    source: OriginSource;
}

/**
 * The traveler's point of origin for the "Getting there" distance/map:
 * their saved home base (city-level residence) when set, else IP
 * geolocation. Mirrors `usePassportCountry`'s profile-first precedence but
 * carries coordinates so the map can draw the route. Residence is the right
 * default here — "from where I live" — with IP as a fallback only.
 */
export const useTravelerOrigin = (): {
    data: TravelerOrigin | null;
    isLoading: boolean;
    isError: boolean;
} => {
    const { user } = useUser();
    const homeCode = user?.homeCountryCode?.toUpperCase() || null;
    const ip = useUserLocation(!homeCode);

    if (homeCode && user) {
        return {
            data: {
                lat: user.homeLatitude,
                lng: user.homeLongitude,
                city: user.homeCity ?? '',
                country: user.homeCountry ?? '',
                countryCode: homeCode,
                source: 'residence',
            },
            isLoading: false,
            isError: false,
        };
    }
    return {
        data: ip.data
            ? {
                  lat: ip.data.lat,
                  lng: ip.data.lng,
                  city: ip.data.city,
                  country: ip.data.country,
                  countryCode: ip.data.countryCode,
                  source: 'ip',
              }
            : null,
        isLoading: ip.isLoading,
        isError: ip.isError,
    };
};
