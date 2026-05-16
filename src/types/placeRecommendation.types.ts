/** AI-curated place returned by `GET /place-recommendations`. Mirrors
 *  the backend `PlaceItem` schema. Image fields stay null in Phase 1
 *  (Unsplash integration lands in Phase 2). */
export interface PlaceRecommendation {
  name: string;
  city: string;
  country: string;
  rating: number;          // 0-5
  bestTimeToVisit: string; // e.g. "May to October"
  description: string;
  imageUrl: string | null;
  photographerName: string | null;
  photographerUrl: string | null;
}

export interface PlaceRecommendationsResult {
  query: string;
  cached: boolean;
  items: PlaceRecommendation[];
}
