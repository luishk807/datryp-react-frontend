import ParagraphSkeleton from "components/common/ParagraphSkeleton";
import "./index.scss";

export interface PlaceDescriptionProps {
  /** The enriched long description from the `/place-details` query.
   *  Pass `undefined` while the query is still loading. */
  longDescription: string | undefined;
  /** Whether the enriched query errored. When true, the component falls
   *  back to rendering `fallbackDescription` instead of a skeleton, so
   *  the page still shows *something* describing the place. */
  isError: boolean;
  /** Cached short description from the search-results payload. Used
   *  whenever the enriched query is unavailable due to an error. */
  fallbackDescription: string;
}

/**
 * The big top-of-page paragraph describing the destination. Prefers the
 * enriched long description, but shows the cached search-result description
 * IMMEDIATELY while the enriched query is still loading (rather than a
 * shimmer) so the primary text is readable up front and just upgrades to the
 * richer copy when it arrives. Only falls back to a skeleton when there's no
 * text at all yet. Lives outside any `MainSection` shell — directly above the
 * "About <country>" block.
 */
const PlaceDescription = ({
  longDescription,
  isError,
  fallbackDescription,
}: PlaceDescriptionProps) => {
  if (longDescription) {
    return <p className="place-description">{longDescription}</p>;
  }
  // Show the cached short description right away (loading OR error) — the user
  // reads real content instead of a shimmer while the long copy resolves.
  if (fallbackDescription) {
    return <p className="place-description">{fallbackDescription}</p>;
  }
  if (isError) {
    return null;
  }
  return <ParagraphSkeleton lines={6} />;
};

export default PlaceDescription;
