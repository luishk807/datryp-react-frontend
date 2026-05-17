/** Country-level enriched info returned by `GET /country-details?code=XX`.
 *  Mirrors backend `CountryDetails` — reuses the same sub-types as PlaceDetails
 *  (already country-level under the hood), drops city-specific fields, and
 *  adds `topCities` + `capitalCity` + `bestTimeToVisit`. */
import type {
    CurrencyInfo,
    LocalFlavor,
    LodgingInfo,
    NamedTip,
    NearbyDestination,
    SafetyInfo,
    TravelBasics,
    VisaInfo,
} from "./placeDetails.types";

export interface CountryDetails {
    longDescription: string;
    capitalCity: string;
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
