import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import { useTranslation } from "react-i18next";
import AsyncDetailSection from "components/PlaceDetail/AsyncDetailSection";
import TravelWidget from "components/PlaceDetail/TravelWidget";
import type { Coordinates } from "types";

export interface GettingThereSectionProps {
  /** Display name shown in the Google-Maps deep-link label
   *  (e.g. "Tokyo Tower, Tokyo"). Always present. */
  placeName: string;
  /** Destination lat/lng from the enriched query. `undefined` while
   *  loading — `AsyncDetailSection` shows a 3-line paragraph skeleton
   *  in its place. */
  coordinates: Coordinates | undefined;
  /** Whether the enriched query errored. When true the section shows
   *  an inline "Could not load travel info." paragraph. */
  isError: boolean;
}

/**
 * "Getting there" sidebar section. Wraps `AsyncDetailSection` with a
 * plane icon and renders `TravelWidget` (distance + estimated travel
 * time + Google Maps deep-link) once the destination coordinates
 * resolve.
 */
const GettingThereSection = ({
  placeName,
  coordinates,
  isError,
}: GettingThereSectionProps) => {
  const { t } = useTranslation();
  return (
    <AsyncDetailSection
      title={t('detail.common.gettingThere.title')}
      icon={<FlightTakeoffRoundedIcon />}
      data={coordinates}
      isError={isError}
      errorMessage={t('detail.common.gettingThere.error')}
      loadingHint={t('detail.common.gettingThere.loading')}
      skeletonLines={3}
    >
      {(coords) => <TravelWidget placeName={placeName} placeCoords={coords} />}
    </AsyncDetailSection>
  );
};

export default GettingThereSection;
