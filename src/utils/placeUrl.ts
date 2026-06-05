/**
 * Build the `/place` detail-page URL for a known place.
 *
 * When the city + country are known, emits the "go-direct" form
 * (`/place?q=<name>&city=<city>&country=<country>`) so the detail page resolves
 * the place via a single-place seed and skips the 5-result AI recommender
 * "discovery hop". Without them it falls back to the legacy name-search form
 * (`/place?q=<name>&i=0`), which runs the recommender as before.
 *
 * Used by every "known place" entry point — saved, visited, map pins,
 * similar-to-saves — so the go-direct contract lives in one place.
 */
export const placeDetailUrl = (
  name: string,
  city?: string | null,
  country?: string | null,
): string => {
  const params = new URLSearchParams({ q: name });
  if (city?.trim() && country?.trim()) {
    params.set("city", city.trim());
    params.set("country", country.trim());
  } else {
    params.set("i", "0");
  }
  return `/place?${params.toString()}`;
};
