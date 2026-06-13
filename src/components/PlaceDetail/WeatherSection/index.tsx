import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import { useTranslation } from "react-i18next";
import WeatherWidget from "components/WeatherWidget";
import AsyncDetailSection from "components/PlaceDetail/AsyncDetailSection";
import { useWeather } from "api/hooks/useWeather";
import type { Coordinates, WeatherLive } from "types";

export interface WeatherSectionProps {
  /** Climate-summary prose from the AI `prose` slice. Used as a secondary
   *  "typical climate" line under the live readout, and as the full fallback
   *  body when live weather is unavailable. Pass `undefined` while the slice
   *  is still loading — a skeleton renders in its place. */
  weather: string | undefined;
  /** Destination coordinates (from the `facts` slice). When present, the
   *  section fetches real current conditions from `/weather` (Open-Meteo) and
   *  renders them; falls back to the `weather` prose if the lookup fails. */
  coordinates?: Coordinates;
  /** Whether the prose query errored. With no live weather to show, the section
   *  shows an inline "Could not load weather." paragraph instead. */
  isError: boolean;
}

/** Combined payload AsyncDetailSection switches on: non-null once we have either
 *  real conditions or climate prose, so the section leaves its skeleton state. */
interface WeatherPayload {
  live?: WeatherLive;
  text?: string;
}

/**
 * "Weather" sidebar section. Prefers real current conditions from Open-Meteo
 * (when coordinates are known) and keeps the AI climate sentence as secondary
 * context / fallback. Wraps `AsyncDetailSection` so loading + error states match
 * the sibling Currency / Safety widgets.
 */
const WeatherSection = ({ weather, coordinates, isError }: WeatherSectionProps) => {
  const { t } = useTranslation();
  const live = useWeather(coordinates?.lat, coordinates?.lng);

  // Ready once we have live conditions OR the climate prose. A failed live
  // lookup (`retry: 0`) just leaves `live.data` undefined and we fall through
  // to the prose, so Open-Meteo being down never blanks the section.
  const payload: WeatherPayload | undefined = live.data
    ? { live: live.data, text: weather }
    : weather
      ? { text: weather }
      : undefined;

  return (
    <AsyncDetailSection
      title={t('detail.common.weather.title')}
      icon={<WbSunnyRoundedIcon />}
      data={payload}
      isError={isError}
      errorMessage={t('detail.common.weather.error')}
      loadingHint={t('detail.common.weather.loading')}
      skeletonLines={3}
    >
      {(p) => <WeatherWidget text={p.text} current={p.live} />}
    </AsyncDetailSection>
  );
};

export default WeatherSection;
