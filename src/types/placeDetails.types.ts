/** A name + 1-sentence "why" — used for foods, places-to-visit, and
 *  things-to-do on the detail page. Mirrors backend `NamedTip`. */
export interface NamedTip {
  name: string;
  why: string;
}

/** Approximate FX rate sourced from OpenAI's training data — display with
 *  an "approximate" caveat in the UI. Mirrors backend `CurrencyInfo`. */
export interface CurrencyInfo {
  code: string;       // e.g. "THB"
  name: string;       // e.g. "Thai Baht"
  ratePerUsd: number; // units of local currency per 1 USD
}

export type SafetyLevel = 'low' | 'moderate' | 'high';

/** Rough traveler-safety read. `score` is 0-100 (100 = safest); `level` is
 *  a coarse band the UI uses for color + label. Mirrors backend `SafetyInfo`. */
export interface SafetyInfo {
  score: number;
  level: SafetyLevel;
  summary: string;
}

/** Approximate lat/lng of the place — feeds the travel-from-your-IP
 *  estimate and the Google Maps deep link. */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** Tourist-visa picture for the destination — ISO 3166-1 alpha-2 codes that
 *  get visa-free / visa-on-arrival entry, plus a free-text fallback summary.
 *  Mirrors backend `VisaInfo`. */
export interface VisaInfo {
  destinationCountryCode: string;
  visaFreeCountries: string[];
  visaOnArrivalCountries: string[];
  summary: string;
}

export type PaymentMethod = 'cash' | 'card' | 'mixed';

/** Free-form short label for a nearby destination's "type": e.g.
 *  "city", "region", "country", "district", "park", "neighborhood".
 *  Kept loose because the backend AI returns context-appropriate values that
 *  don't always fit a small enum (e.g. Tokyo districts, Kyoto parks). */
export type NearbyKind = string;

/** A nearby city / region / country / district / etc. worth visiting from
 *  the current place. Rendered as a clickable card linking to
 *  `/place?q=<name>&i=0`. lat/lng feed the distance-from-current-place sort. */
export interface NearbyDestination {
  name: string;
  country: string;
  kind: NearbyKind;
  why: string;
  lat: number;
  lng: number;
}

/** Locale-specific 'don't leave without...' info — fun energy, nightlife,
 *  signature drink, unique souvenir, and 5 must-do experiences. Mirrors
 *  backend `LocalFlavor`. */
export interface LocalFlavor {
  /** 1 (quiet) – 5 (high-energy party scene). */
  funLevel: number;
  nightlife: string;
  famousLiquor: string;
  uniqueSouvenir: string;
  mustDoBeforeLeaving: NamedTip[];
}

export type Availability = 'common' | 'limited' | 'none';

/** Where to stay — Airbnb vs hotel availability, recommended lodging type,
 *  typical price range, and a booking tip. Mirrors backend `LodgingInfo`. */
export interface LodgingInfo {
  recommendedType: string;
  airbnbAvailability: Availability;
  airbnbNote: string;
  hotelAvailability: Availability;
  hotelNote: string;
  priceRange: string;
  bookingTip: string;
}

/** Practical 'know-before-you-go' info — transport, payment, language, vibe,
 *  audience, age. Mirrors backend `TravelBasics`. */
export interface TravelBasics {
  preferredTransport: string;
  transportSystem: string;
  paymentMethod: PaymentMethod;
  paymentNote: string;
  language: string;
  vibe: string;
  audience: string;
  ageRecommendation: string;
}

/** One airport that serves a destination. AI-populated alongside the
 *  rest of the detail-page payload. IATA code is what travelers
 *  actually book with; `international` flags hub airports vs. small
 *  regional fields. */
export interface Airport {
  iataCode: string;
  name: string;
  distanceKm: number;
  international: boolean;
}

/** Enriched detail-page info. Lazy-fetched per place from `/place-details`. */
export interface PlaceDetails {
  longDescription: string;
  countryDescription: string;
  budgetDescription: string;
  cityHighlight: string;
  countryHighlight: string;
  foods: NamedTip[];
  placesToVisit: NamedTip[];
  thingsToDo: NamedTip[];
  photoSpots: NamedTip[];
  notesToKnow: NamedTip[];
  worstTimeToVisit: string;
  weather: string;
  currency: CurrencyInfo;
  safety: SafetyInfo;
  coordinates: Coordinates;
  travelBasics: TravelBasics;
  lodging: LodgingInfo;
  nearbyDestinations: NearbyDestination[];
  localFlavor: LocalFlavor;
  /** 1 (cheapest) – 5 (most expensive). */
  costLevel: number;
  visa: VisaInfo;
  /** Airports serving the place. Sorted by usefulness (largest hub
   *  first). May be empty for rows cached before this field shipped. */
  airports: Airport[];
}

export interface PlaceDetailsResult {
  query: string;
  index: number;
  cached: boolean;
  details: PlaceDetails;
}
