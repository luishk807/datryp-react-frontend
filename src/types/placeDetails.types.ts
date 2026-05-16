/** A name + 1-sentence "why" — used for foods and places-to-visit on the
 *  detail page. Mirrors backend `NamedTip`. */
export interface NamedTip {
  name: string;
  why: string;
}

/** Enriched detail-page info (foods, nearby places, worst time, weather).
 *  Lazy-fetched per place from `/place-details`. */
export interface PlaceDetails {
  foods: NamedTip[];
  placesToVisit: NamedTip[];
  worstTimeToVisit: string;
  weather: string;
}

export interface PlaceDetailsResult {
  query: string;
  index: number;
  cached: boolean;
  details: PlaceDetails;
}
