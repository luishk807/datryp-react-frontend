import { diffDays, isValidDate } from "./date";
import type { Destination, TripState } from "types";

const toNumber = (v?: string | number): number => {
    if (v == null) return 0;
    const n = typeof v === "number" ? v : parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};

/** Total spend across a trip: each destination's arrival-flight cost (which
 *  lives on `flightInfo`, the header band, NOT as an itinerary activity) plus
 *  every itinerary activity cost. Shared by the BudgetSummary meter and the
 *  completion recap so "spent" reads identically in both places. */
export const sumActivityCosts = (destinations: Destination[] = []): number => {
    let total = 0;
    destinations.forEach((dest) => {
        total += toNumber(dest.flightInfo?.cost);
        dest.itinerary?.forEach((day) => {
            day.activities?.forEach((activity) => {
                total += toNumber(activity.cost);
            });
        });
    });
    return total;
};

export interface TripStats {
    days: number;
    activities: number;
    spent: number;
    countries: number;
}

/** Roll a trip up into its recap numbers. `days` prefers the real trip span
 *  (start→end inclusive) and falls back to the itinerary day count when dates
 *  are missing/invalid. `countries` is deduped by code (falling back to name)
 *  so two stops in the same country count once. Travelers is intentionally
 *  NOT derived here — it needs the friends+organizer dedup the caller already
 *  owns, so it stays a prop on the consuming card. */
export const deriveTripStats = (data: TripState): TripStats => {
    const destinations = data.destinations ?? [];

    let activities = 0;
    let itineraryDays = 0;
    const countryKeys = new Set<string>();
    destinations.forEach((dest) => {
        itineraryDays += dest.itinerary?.length ?? 0;
        dest.itinerary?.forEach((day) => {
            activities += day.activities?.length ?? 0;
        });
        const name = dest.country?.name;
        if (name) countryKeys.add((dest.country?.code ?? name).toLowerCase());
    });

    let days = itineraryDays;
    if (isValidDate(data.startDate) && isValidDate(data.endDate)) {
        const span = diffDays(data.startDate, data.endDate) + 1;
        if (span >= 1) days = span;
    }

    return {
        days,
        activities,
        spent: sumActivityCosts(destinations),
        countries: countryKeys.size,
    };
};

export interface AtlasRecord {
    countries: number;
    cities: number;
    places: number;
}

/** What completing a trip wrote into the Travel Atlas: deduped countries +
 *  cities and the count of real places recorded. Mirrors the backend
 *  visited-place cascade — a "place" is an activity carrying full place
 *  identity (name + city + country), which is exactly what gets a
 *  `place_key` and a `visited_places` row. Free-text entries, notes, and
 *  transport legs lack that identity and don't count. */
export const deriveAtlasRecord = (data: TripState): AtlasRecord => {
    const destinations = data.destinations ?? [];
    const countryKeys = new Set<string>();
    const cityKeys = new Set<string>();
    let places = 0;

    destinations.forEach((dest) => {
        const name = dest.country?.name;
        if (name) countryKeys.add((dest.country?.code ?? name).toLowerCase());
        dest.itinerary?.forEach((day) => {
            day.activities?.forEach((activity) => {
                if (
                    !activity.name ||
                    !activity.placeCity ||
                    !activity.placeCountry
                ) {
                    return;
                }
                places += 1;
                cityKeys.add(
                    `${activity.placeCity}|${activity.placeCountry}`.toLowerCase(),
                );
            });
        });
    });

    return {
        countries: countryKeys.size,
        cities: cityKeys.size,
        places,
    };
};
