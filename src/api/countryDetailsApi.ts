/**
 * Fetch wrapper for `GET /country-details?code=XX` on the Python backend.
 * REST (not GraphQL) — see backend `app/routers/country_details.py`.
 */
import type {
    CountryDetails,
    CountryDetailsResult,
    CountrySummary,
} from "types";

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? "http://localhost:8000";

interface NamedTipRaw {
    name: string;
    why: string;
}

interface CurrencyInfoRaw {
    code: string;
    name: string;
    rate_per_usd: number;
}

interface SafetyInfoRaw {
    score: number;
    level: "low" | "moderate" | "high";
    summary: string;
}

interface TravelBasicsRaw {
    preferred_transport: string;
    transport_system: string;
    payment_method: "cash" | "card" | "mixed";
    payment_note: string;
    language: string;
    vibe: string;
    audience: string;
    age_recommendation: string;
}

interface VisaInfoRaw {
    destination_country_code: string;
    visa_free_countries: string[];
    visa_on_arrival_countries: string[];
    summary: string;
}

interface LodgingInfoRaw {
    recommended_type: string;
    airbnb_availability: "common" | "limited" | "none";
    airbnb_note: string;
    hotel_availability: "common" | "limited" | "none";
    hotel_note: string;
    price_range: string;
    booking_tip: string;
}

interface NearbyDestinationRaw {
    name: string;
    country: string;
    kind: string;
    why: string;
    lat: number;
    lng: number;
}

interface LocalFlavorRaw {
    fun_level: number;
    nightlife: string;
    famous_liquor: string;
    unique_souvenir: string;
    must_do_before_leaving: NamedTipRaw[];
}

interface CountryDetailsRaw {
    long_description: string;
    capital_city: string;
    budget_description: string;
    country_highlight: string;
    top_cities: NamedTipRaw[];
    foods: NamedTipRaw[];
    things_to_do: NamedTipRaw[];
    photo_spots: NamedTipRaw[];
    notes_to_know: NamedTipRaw[];
    best_time_to_visit: string;
    worst_time_to_visit: string;
    weather: string;
    currency: CurrencyInfoRaw;
    safety: SafetyInfoRaw;
    travel_basics: TravelBasicsRaw;
    lodging: LodgingInfoRaw;
    nearby_destinations: NearbyDestinationRaw[];
    local_flavor: LocalFlavorRaw;
    cost_level: number;
    visa: VisaInfoRaw;
}

interface CountrySummaryRaw {
    id: string;
    name: string;
    code: string;
    local: string | null;
    image: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface CountryDetailsResponseRaw {
    country: CountrySummaryRaw;
    cached: boolean;
    details: CountryDetailsRaw;
}

const toCountry = (raw: CountrySummaryRaw): CountrySummary => ({
    id: raw.id,
    name: raw.name,
    code: raw.code,
    local: raw.local,
    image: raw.image,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
});

const toDetails = (raw: CountryDetailsRaw): CountryDetails => ({
    longDescription: raw.long_description,
    capitalCity: raw.capital_city,
    budgetDescription: raw.budget_description,
    countryHighlight: raw.country_highlight,
    topCities: raw.top_cities,
    foods: raw.foods,
    thingsToDo: raw.things_to_do,
    photoSpots: raw.photo_spots,
    notesToKnow: raw.notes_to_know,
    bestTimeToVisit: raw.best_time_to_visit,
    worstTimeToVisit: raw.worst_time_to_visit,
    weather: raw.weather,
    currency: {
        code: raw.currency.code,
        name: raw.currency.name,
        ratePerUsd: raw.currency.rate_per_usd,
    },
    safety: {
        score: raw.safety.score,
        level: raw.safety.level,
        summary: raw.safety.summary,
    },
    travelBasics: {
        preferredTransport: raw.travel_basics.preferred_transport,
        transportSystem: raw.travel_basics.transport_system,
        paymentMethod: raw.travel_basics.payment_method,
        paymentNote: raw.travel_basics.payment_note,
        language: raw.travel_basics.language,
        vibe: raw.travel_basics.vibe,
        audience: raw.travel_basics.audience,
        ageRecommendation: raw.travel_basics.age_recommendation,
    },
    lodging: {
        recommendedType: raw.lodging.recommended_type,
        airbnbAvailability: raw.lodging.airbnb_availability,
        airbnbNote: raw.lodging.airbnb_note,
        hotelAvailability: raw.lodging.hotel_availability,
        hotelNote: raw.lodging.hotel_note,
        priceRange: raw.lodging.price_range,
        bookingTip: raw.lodging.booking_tip,
    },
    nearbyDestinations: raw.nearby_destinations,
    localFlavor: {
        funLevel: raw.local_flavor.fun_level,
        nightlife: raw.local_flavor.nightlife,
        famousLiquor: raw.local_flavor.famous_liquor,
        uniqueSouvenir: raw.local_flavor.unique_souvenir,
        mustDoBeforeLeaving: raw.local_flavor.must_do_before_leaving,
    },
    costLevel: raw.cost_level,
    visa: {
        destinationCountryCode: raw.visa.destination_country_code,
        visaFreeCountries: raw.visa.visa_free_countries,
        visaOnArrivalCountries: raw.visa.visa_on_arrival_countries,
        summary: raw.visa.summary,
    },
});

export const fetchCountryDetails = async (
    code: string
): Promise<CountryDetailsResult> => {
    const params = new URLSearchParams({ code });
    const resp = await fetch(`${API_BASE}/country-details?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/country-details failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as CountryDetailsResponseRaw;
    return {
        country: toCountry(body.country),
        cached: body.cached,
        details: toDetails(body.details),
    };
};
