import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import MainSection from "components/PlaceDetail/MainSection";
import NearbyGrid, {
  NearbyGridSkeleton,
} from "components/PlaceDetail/NearbyGrid";
import type { Coordinates, NearbyDestination } from "types";

export interface NearbySectionProps {
  /** The resolved list of nearby destinations. Pass `undefined` while the
   *  query is still loading — a `NearbyGridSkeleton` renders instead. */
  items: NearbyDestination[] | undefined;
  /** Origin coordinates for the distance calculation. Pass `undefined`
   *  while the query is still loading; the loading state ignores it. */
  origin: Coordinates | undefined;
  /** When true, the whole section renders nothing. Pass the source
   *  query's `isError` flag here instead of wrapping the call site in
   *  a `!isError && (...)` guard. */
  isError?: boolean;
}

/**
 * "Nearby — worth a side trip" section that sits in the main content
 * column of the place-detail page. Wraps `MainSection` with an explore
 * icon and renders `NearbyGrid` (or its skeleton) inside.
 */
const NearbySection = ({
  items,
  origin,
  isError = false,
}: NearbySectionProps) => {
  if (isError) return null;
  return (
    <MainSection
      title="Nearby — worth a side trip"
      icon={<ExploreRoundedIcon />}
      size="md"
    >
      {items && origin ? (
        <NearbyGrid items={items} origin={origin} />
      ) : (
        <NearbyGridSkeleton />
      )}
    </MainSection>
  );
};

export default NearbySection;
