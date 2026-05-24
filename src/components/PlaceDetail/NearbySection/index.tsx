import ExploreRoundedIcon from "@mui/icons-material/ExploreRounded";
import MainSection from "components/PlaceDetail/MainSection";
import NearbyGrid, {
  NearbyGridSkeleton,
} from "components/PlaceDetail/NearbyGrid";
import type { NearbyDestination } from "types";

export interface NearbySectionProps {
  /** The resolved list of nearby destinations. Pass `undefined` while the
   *  query is still loading — a `NearbyGridSkeleton` renders instead. */
  items: NearbyDestination[] | undefined;
  /** When true, the whole section renders nothing. Pass the source
   *  query's `isError` flag here instead of wrapping the call site in
   *  a `!isError && (...)` guard. */
  isError?: boolean;
}

/**
 * "Nearby — worth a side trip" section. Renders as a horizontal card
 * grid (responsive — stacks on narrow viewports), each card image-led
 * with a name / kind / why blurb. The distance-from-origin sort was
 * dropped: the recommender already orders by relevance, and showing a
 * "12 mi" badge on a country-scale entry felt arbitrary.
 */
const NearbySection = ({ items, isError = false }: NearbySectionProps) => {
  if (isError) return null;
  return (
    <MainSection
      title="Nearby — worth a side trip"
      icon={<ExploreRoundedIcon />}
      size="md"
    >
      {items ? <NearbyGrid items={items} /> : <NearbyGridSkeleton />}
    </MainSection>
  );
};

export default NearbySection;
