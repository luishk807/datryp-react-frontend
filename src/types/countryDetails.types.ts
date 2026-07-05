/** Country-level enriched info returned by `GET /country-details?code=XX`.
 *  Mirrors backend `CountryDetails` — reuses the same sub-types as PlaceDetails
 *  (already country-level under the hood), drops city-specific fields, and
 *  adds `topCities` + `capitalCity` + `bestTimeToVisit`. */
import type {
    Airport,
    CurrencyInfo,
    LocalFlavor,
    LodgingInfo,
    NamedTip,
    NearbyDestination,
    PopularityInfo,
    SafetyInfo,
    TravelBasics,
    VisaInfo,
} from "./placeDetails.types";

import type { Coordinates } from "./placeDetails.types";

export interface CountryDetails {
    longDescription: string;
    capitalCity: string;
    /** Lat/lng of the capital city. Optional because rows cached
     *  before this field shipped don't carry it — the UI hides the
     *  Getting There map when absent. */
    capitalCoordinates?: Coordinates;
    budgetDescription: string;
    countryHighlight: string;
    topCities: NamedTip[];
    foods: NamedTip[];
    thingsToDo: NamedTip[];
    photoSpots: NamedTip[];
    notesToKnow: NamedTip[];
    bestTimeToVisit: string;
    worstTimeToVisit: string;
    weather: string;
    currency: CurrencyInfo;
    safety: SafetyInfo;
    travelBasics: TravelBasics;
    lodging: LodgingInfo;
    nearbyDestinations: NearbyDestination[];
    localFlavor: LocalFlavor;
    /** 1 (cheapest) – 5 (most expensive). */
    costLevel: number;
    visa: VisaInfo;
    /** Major international airports serving the country. Empty for
     *  cache rows from before this field shipped. */
    airports: Airport[];
    /** AI-curated 0-5 overall tourist rating. Pairs with the
     *  crowdsourced review average to give the country header both a
     *  "global rating" and a "user rating". 0 = unavailable
     *  (pre-existing cache rows from before this field shipped). */
    touristRating: number;
    /** Year-current traveler-popularity read. Optional for rows cached
     *  before this field shipped — the UI hides the meter when absent. */
    popularity?: PopularityInfo;
    /** Heads-up on cultural-shock moments a first-time visitor might
     *  experience. Optional for rows cached before this field shipped. */
    culturalShock?: string;
    /** Actionable "sort this before you fly" checklist. Optional for rows
     *  cached before this field shipped — the UI hides it when empty. */
    beforeYouGo?: string[];
}

export interface CountrySummary {
    id: string;
    name: string;
    code: string;
    local: string | null;
    image: string | null;
    photographerName: string | null;
    photographerUrl: string | null;
}

export interface CountryDetailsResult {
    country: CountrySummary;
    cached: boolean;
    details: CountryDetails;
}
