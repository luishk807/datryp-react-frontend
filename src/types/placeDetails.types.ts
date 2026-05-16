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

export type NearbyKind = 'city' | 'country' | 'region';

/** A nearby city / region / country worth visiting from the current place.
 *  Rendered as a clickable card linking to `/place?q=<name>&i=0`. lat/lng
 *  feed the distance-from-current-place sort. */
export interface NearbyDestination {
  name: string;
  country: string;
  kind: NearbyKind;
  why: string;
  lat: number;
  lng: number;
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
  /** 1 (cheapest) – 5 (most expensive). */
  costLevel: number;
  visa: VisaInfo;
}

export interface PlaceDetailsResult {
  query: string;
  index: number;
  cached: boolean;
  details: PlaceDetails;
}
