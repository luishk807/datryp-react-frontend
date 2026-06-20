import { useMemo } from 'react';
import { useVisitedCountries } from 'api/hooks/useVisitedCountries';
import { useVisitedCities } from 'api/hooks/useVisitedCities';
import { useVisitedPlaces } from 'api/hooks/useVisitedPlaces';
import { WORLD_COUNTRY_COUNT } from 'constants';

export interface AtlasStats {
    /** Unique countries visited — see note below. */
    countries: number;
    cities: number;
    places: number;
    /** Share of the world's sovereign countries visited, 0–100. */
    worldPct: number;
    isLoading: boolean;
}

/**
 * Travel Atlas summary numbers, shared by the `/atlas-map` page and the My
 * Trips Atlas summary card so both report the same figures.
 *
 * `countries` is the UNION of unique ISO codes across visited countries,
 * cities, and places — a visited city/place implies its country was visited
 * too — matching how the Atlas shades the map and counts countries.
 */
export const useAtlasStats = (): AtlasStats => {
    const { data: countriesData, isLoading: loadingCountries } =
        useVisitedCountries();
    const { data: citiesData, isLoading: loadingCities } = useVisitedCities();
    const { data: placesData, isLoading: loadingPlaces } = useVisitedPlaces();

    return useMemo(() => {
        const countries = countriesData?.items ?? [];
        const cities = citiesData?.items ?? [];
        const places = placesData?.items ?? [];

        const codes = new Set<string>();
        const push = (raw: string | null | undefined) => {
            if (raw) codes.add(raw.toUpperCase());
        };
        for (const c of countries) push(c.countryCode);
        for (const c of cities) push(c.countryCode);
        for (const p of places) push(p.countryCode);

        return {
            countries: codes.size,
            cities: cities.length,
            places: places.length,
            worldPct: (codes.size / WORLD_COUNTRY_COUNT) * 100,
            isLoading: loadingCountries || loadingCities || loadingPlaces,
        };
    }, [
        countriesData,
        citiesData,
        placesData,
        loadingCountries,
        loadingCities,
        loadingPlaces,
    ]);
};
