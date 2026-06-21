/** AI-curated place returned by `GET /place-recommendations`. Mirrors
 *  the backend `PlaceItem` schema. Image fields stay null in Phase 1
 *  (Unsplash integration lands in Phase 2).
 *
 *  `latitude`, `longitude`, `countryCode` are nullable because cached
 *  rows written before the recommender prompt was extended don't carry
 *  them. New cache rows populate the trio together. */
export interface PlaceRecommendation {
  name: string;
  city: string;
  country: string;
  countryCode: string | null;
  rating: number;          // 0-5
  bestTimeToVisit: string; // e.g. "May to October"
  description: string;
  imageUrl: string | null;
  photographerName: string | null;
  photographerUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PlaceRecommendationsResult {
  query: string;
  cached: boolean;
  items: PlaceRecommendation[];
  /** Results-page extras for the "Search by Interest" discovery flow: a 1-2
   *  sentence AI overview of the matches. Absent for suggestion / trip-scoped
   *  calls and for cache rows written before the field shipped — render only
   *  when present. */
  summary?: string;
  /** 3-4 related search phrases for the discovery flow, rendered as chips that
   *  re-run the search. Empty/absent in the same cases as `summary`. */
  relatedSearches?: string[];
}
