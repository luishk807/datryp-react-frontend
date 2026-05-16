/**
 * Fetch wrapper for `GET /place-recommendations` on the Python backend.
 * REST (not GraphQL) — see backend `app/routers/place_recommendations.py`.
 */
import type {
    PlaceDetails,
    PlaceDetailsResult,
    PlaceRecommendation,
    PlaceRecommendationsResult,
} from 'types';

const API_BASE =
    import.meta.env.VITE_PYTHON_API_URL ?? 'http://localhost:8000';

interface PlaceItemRaw {
    name: string;
    city: string;
    country: string;
    rating: number;
    best_time_to_visit: string;
    description: string;
    image_url: string | null;
    photographer_name: string | null;
    photographer_url: string | null;
}

interface PlaceRecommendationsResponseRaw {
    query: string;
    cached: boolean;
    items: PlaceItemRaw[];
}

const toPlace = (raw: PlaceItemRaw): PlaceRecommendation => ({
    name: raw.name,
    city: raw.city,
    country: raw.country,
    rating: raw.rating,
    bestTimeToVisit: raw.best_time_to_visit,
    description: raw.description,
    imageUrl: raw.image_url,
    photographerName: raw.photographer_name,
    photographerUrl: raw.photographer_url,
});

export const fetchPlaceRecommendations = async (
    query: string,
    limit = 2
): Promise<PlaceRecommendationsResult> => {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const resp = await fetch(`${API_BASE}/place-recommendations?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/place-recommendations failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as PlaceRecommendationsResponseRaw;
    return {
        query: body.query,
        cached: body.cached,
        items: body.items.map(toPlace),
    };
};

// ─── /place-details ────────────────────────────────────────────────────────

interface CurrencyInfoRaw {
    code: string;
    name: string;
    rate_per_usd: number;
}

interface SafetyInfoRaw {
    score: number;
    level: 'low' | 'moderate' | 'high';
    summary: string;
}

interface CoordinatesRaw {
    lat: number;
    lng: number;
}

interface TravelBasicsRaw {
    preferred_transport: string;
    transport_system: string;
    payment_method: 'cash' | 'card' | 'mixed';
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
    airbnb_availability: 'common' | 'limited' | 'none';
    airbnb_note: string;
    hotel_availability: 'common' | 'limited' | 'none';
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
    must_do_before_leaving: { name: string; why: string }[];
}

interface PlaceDetailsRaw {
    long_description: string;
    country_description: string;
    budget_description: string;
    city_highlight: string;
    country_highlight: string;
    foods: { name: string; why: string }[];
    places_to_visit: { name: string; why: string }[];
    things_to_do: { name: string; why: string }[];
    photo_spots: { name: string; why: string }[];
    notes_to_know: { name: string; why: string }[];
    worst_time_to_visit: string;
    weather: string;
    currency: CurrencyInfoRaw;
    safety: SafetyInfoRaw;
    coordinates: CoordinatesRaw;
    travel_basics: TravelBasicsRaw;
    lodging: LodgingInfoRaw;
    nearby_destinations: NearbyDestinationRaw[];
    local_flavor: LocalFlavorRaw;
    cost_level: number;
    visa: VisaInfoRaw;
}

interface PlaceDetailsResponseRaw {
    query: string;
    index: number;
    cached: boolean;
    details: PlaceDetailsRaw;
}

const toDetails = (raw: PlaceDetailsRaw): PlaceDetails => ({
    longDescription: raw.long_description,
    countryDescription: raw.country_description,
    budgetDescription: raw.budget_description,
    cityHighlight: raw.city_highlight,
    countryHighlight: raw.country_highlight,
    foods: raw.foods,
    placesToVisit: raw.places_to_visit,
    thingsToDo: raw.things_to_do,
    photoSpots: raw.photo_spots,
    notesToKnow: raw.notes_to_know,
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
    coordinates: {
        lat: raw.coordinates.lat,
        lng: raw.coordinates.lng,
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

export const fetchPlaceDetails = async (
    query: string,
    index: number
): Promise<PlaceDetailsResult> => {
    const params = new URLSearchParams({ q: query, i: String(index) });
    const resp = await fetch(`${API_BASE}/place-details?${params}`);
    if (!resp.ok) {
        throw new Error(
            `/place-details failed: ${resp.status} ${resp.statusText}`
        );
    }
    const body = (await resp.json()) as PlaceDetailsResponseRaw;
    return {
        query: body.query,
        index: body.index,
        cached: body.cached,
        details: toDetails(body.details),
    };
};
