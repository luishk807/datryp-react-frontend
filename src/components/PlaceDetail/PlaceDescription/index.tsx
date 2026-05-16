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
 * The big top-of-page paragraph describing the destination. Renders the
 * enriched long description when available, falls back to the cached
 * search-result description on error, and shows a 6-line shimmer while
 * the enriched query is loading. Unlike the page's other sections this
 * lives outside any `MainSection` shell — it sits directly above the
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
  if (isError) {
    return <p className="place-description">{fallbackDescription}</p>;
  }
  return <ParagraphSkeleton lines={6} />;
};

export default PlaceDescription;
