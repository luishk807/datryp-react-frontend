import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import { useTranslation } from "react-i18next";
import DetailSection from "components/PlaceDetail/DetailSection";
import LodgingRows, {
  LodgingSkeleton,
} from "components/PlaceDetail/LodgingRows";
import type { LodgingInfo } from "types";

export interface LodgingSectionProps {
  /** Resolved lodging payload from the enriched query. Pass `undefined`
   *  while loading — a `LodgingSkeleton` renders inside the section
   *  instead. */
  lodging: LodgingInfo | undefined;
  /** When true, the whole section renders nothing. Pass the source
   *  query's `isError` flag here instead of wrapping the call site in
   *  a `!isError && (...)` guard. */
  isError?: boolean;
}

/**
 * "Where to stay" section (recommended type, Airbnb / hotel availability,
 * price range, booking tip). Wraps `DetailSection` with a hotel icon and
 * renders `LodgingRows` or its skeleton.
 */
const LodgingSection = ({
  lodging,
  isError = false,
}: LodgingSectionProps) => {
  const { t } = useTranslation();
  if (isError) return null;
  return (
    <DetailSection
      title={t('detail.common.lodging.title')}
      icon={<HotelRoundedIcon />}
    >
      {lodging ? <LodgingRows lodging={lodging} /> : <LodgingSkeleton />}
    </DetailSection>
  );
};

export default LodgingSection;
