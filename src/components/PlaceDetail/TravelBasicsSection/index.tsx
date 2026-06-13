import LuggageRoundedIcon from "@mui/icons-material/LuggageRounded";
import { useTranslation } from "react-i18next";
import DetailSection from "components/PlaceDetail/DetailSection";
import TravelBasicsRows, {
  TravelBasicsSkeleton,
} from "components/PlaceDetail/TravelBasicsRows";
import type { TravelBasics } from "types";

export interface TravelBasicsSectionProps {
  /** Resolved travel-basics payload from the enriched query. Pass
   *  `undefined` while loading — a `TravelBasicsSkeleton` renders
   *  inside the section instead. */
  basics: TravelBasics | undefined;
  /** When true, the whole section renders nothing. Pass the source
   *  query's `isError` flag here instead of wrapping the call site in
   *  a `!isError && (...)` guard. */
  isError?: boolean;
}

/**
 * "Travel basics" section (full-width key/value rows like Getting around,
 * Payment, Language, …). Wraps `DetailSection` with a luggage icon and
 * renders `TravelBasicsRows` or its skeleton.
 */
const TravelBasicsSection = ({
  basics,
  isError = false,
}: TravelBasicsSectionProps) => {
  const { t } = useTranslation();
  if (isError) return null;
  return (
    <DetailSection
      title={t('detail.common.travelBasics.title')}
      icon={<LuggageRoundedIcon />}
    >
      {basics ? <TravelBasicsRows basics={basics} /> : <TravelBasicsSkeleton />}
    </DetailSection>
  );
};

export default TravelBasicsSection;
